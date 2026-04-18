import logging
import os
from typing import Any, List

from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

# Carrega o .env da raiz do backend (ASAAS_API_KEY, PUBLIC_BASE_URL, JWT_SECRET)
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from .database import Base, engine, get_db, SessionLocal
from . import auth, models, payments, schemas
from .seed import seed_products

log = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)


def _aplicar_migracoes_pix() -> None:
    """Adiciona as colunas de Pix na tabela `orders` se ainda não existirem.

    Evita ter que recriar o banco em dev quando a gente evoluiu o schema.
    """
    inspector = inspect(engine)
    if "orders" not in inspector.get_table_names():
        return
    ja_existe = {c["name"] for c in inspector.get_columns("orders")}
    novas = {
        "mp_payment_id": "VARCHAR",
        "pix_qr_code": "TEXT",
        "pix_qr_code_base64": "TEXT",
        "pix_ticket_url": "VARCHAR",
    }
    with engine.begin() as conn:
        for nome, ddl in novas.items():
            if nome not in ja_existe:
                conn.execute(text(f"ALTER TABLE orders ADD COLUMN {nome} {ddl}"))


_aplicar_migracoes_pix()

# Popula o catálogo na primeira subida (idempotente)
with SessionLocal() as _db:
    seed_products(_db)

app = FastAPI(title="Hexa Store API", version="1.0.0")

# CORS liberado — o frontend está hospedado em outro domínio.
# Não remover: a plataforma de deploy precisa disto pra rotear.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


# --------------------------------------------------------------------
# Auth
# --------------------------------------------------------------------
@app.post("/auth/register", response_model=schemas.Token)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")
    user = models.User(
        email=payload.email.lower(),
        name=payload.name,
        hashed_password=auth.hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = auth.create_access_token({"sub": str(user.id)})
    return schemas.Token(access_token=token, user=schemas.UserOut.model_validate(user))


@app.post("/auth/login", response_model=schemas.Token)
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email.lower()).first()
    if not user or not auth.verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos")
    token = auth.create_access_token({"sub": str(user.id)})
    return schemas.Token(access_token=token, user=schemas.UserOut.model_validate(user))


@app.get("/auth/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


# --------------------------------------------------------------------
# Catálogo
# --------------------------------------------------------------------
@app.get("/products", response_model=List[schemas.ProductOut])
def list_products(db: Session = Depends(get_db)):
    return db.query(models.Product).order_by(models.Product.featured.desc(), models.Product.id.asc()).all()


@app.get("/products/{product_id}", response_model=schemas.ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return product


# --------------------------------------------------------------------
# Carrinho
# --------------------------------------------------------------------
@app.get("/cart", response_model=List[schemas.CartItemOut])
def get_cart(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    return db.query(models.CartItem).filter(models.CartItem.user_id == current_user.id).all()


@app.post("/cart/items", response_model=schemas.CartItemOut)
def add_to_cart(
    payload: schemas.CartItemCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    product = db.query(models.Product).filter(models.Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    if payload.quantity < 1:
        raise HTTPException(status_code=400, detail="Quantidade inválida")

    item = (
        db.query(models.CartItem)
        .filter(
            models.CartItem.user_id == current_user.id,
            models.CartItem.product_id == payload.product_id,
            models.CartItem.size == payload.size,
        )
        .first()
    )
    if item:
        item.quantity += payload.quantity
    else:
        item = models.CartItem(
            user_id=current_user.id,
            product_id=payload.product_id,
            quantity=payload.quantity,
            size=payload.size,
        )
        db.add(item)
    db.commit()
    db.refresh(item)
    return item


@app.patch("/cart/items/{item_id}", response_model=schemas.CartItemOut)
def update_cart_item(
    item_id: int,
    payload: schemas.CartItemUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    item = (
        db.query(models.CartItem)
        .filter(models.CartItem.id == item_id, models.CartItem.user_id == current_user.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    if payload.quantity is not None:
        if payload.quantity < 1:
            raise HTTPException(status_code=400, detail="Quantidade inválida")
        item.quantity = payload.quantity
    if payload.size is not None:
        item.size = payload.size
    db.commit()
    db.refresh(item)
    return item


@app.delete("/cart/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_cart_item(
    item_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    item = (
        db.query(models.CartItem)
        .filter(models.CartItem.id == item_id, models.CartItem.user_id == current_user.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    db.delete(item)
    db.commit()
    return None


@app.delete("/cart", status_code=status.HTTP_204_NO_CONTENT)
def clear_cart(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    db.query(models.CartItem).filter(models.CartItem.user_id == current_user.id).delete()
    db.commit()
    return None


# --------------------------------------------------------------------
# Pedidos
# --------------------------------------------------------------------
@app.post("/orders", response_model=schemas.OrderOut)
def create_order(
    payload: schemas.OrderCreate,
    request: Request,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    cart_items = db.query(models.CartItem).filter(models.CartItem.user_id == current_user.id).all()
    if not cart_items:
        raise HTTPException(status_code=400, detail="Carrinho vazio")

    is_pix = payload.payment_method == "pix"

    total = 0.0
    order = models.Order(
        user_id=current_user.id,
        total=0,
        shipping_address=payload.shipping_address,
        payment_method=payload.payment_method,
        status="pendente" if is_pix else "pago",
    )
    db.add(order)
    db.flush()

    for ci in cart_items:
        line_total = ci.product.price * ci.quantity
        total += line_total
        db.add(
            models.OrderItem(
                order_id=order.id,
                product_id=ci.product_id,
                product_name=ci.product.name,
                product_image=ci.product.image_url,
                unit_price=ci.product.price,
                quantity=ci.quantity,
                size=ci.size,
            )
        )

    order.total = round(total, 2)

    if is_pix:
        try:
            public_base = os.getenv("PUBLIC_BASE_URL") or str(request.base_url).rstrip("/")
            notification_url = f"{public_base}/payments/webhook"
            pix = payments.create_pix_payment(
                amount=order.total,
                description=f"Pedido Hexa Store #{order.id}",
                payer_email=current_user.email,
                payer_name=current_user.name,
                external_reference=str(order.id),
                notification_url=notification_url,
            )
            order.mp_payment_id = pix["id"]
            order.pix_qr_code = pix["qr_code"]
            order.pix_qr_code_base64 = pix["qr_code_base64"]
            order.pix_ticket_url = pix["ticket_url"]
        except Exception as exc:
            log.exception("Falha ao criar cobrança Pix para o pedido %s", order.id)
            db.rollback()
            raise HTTPException(
                status_code=502,
                detail=f"Não foi possível gerar a cobrança Pix: {exc}",
            )

    # Esvazia o carrinho agora que virou pedido
    for ci in cart_items:
        db.delete(ci)

    db.commit()
    db.refresh(order)
    return order


@app.get("/orders", response_model=List[schemas.OrderOut])
def list_orders(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.Order)
        .filter(models.Order.user_id == current_user.id)
        .order_by(models.Order.created_at.desc())
        .all()
    )


@app.get("/orders/{order_id}", response_model=schemas.OrderOut)
def get_order(
    order_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    order = (
        db.query(models.Order)
        .filter(models.Order.id == order_id, models.Order.user_id == current_user.id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")

    # Enquanto o webhook do Asaas não chega, consultamos a situação direto
    # na API deles na hora do polling do frontend. Assim a tela do Pix vira
    # "Pago" mesmo em ambientes sem webhook configurado (ex: sandbox local).
    if order.status == "pendente" and order.mp_payment_id:
        try:
            situacao = payments.get_payment_status(order.mp_payment_id)
            if situacao == "approved":
                order.status = "pago"
                db.commit()
                db.refresh(order)
            elif situacao in ("cancelled", "rejected"):
                order.status = "cancelado"
                db.commit()
                db.refresh(order)
        except Exception:
            log.exception("Falha ao consultar status do Pix para o pedido %s", order.id)

    return order


# --------------------------------------------------------------------
# Webhooks de pagamento
# --------------------------------------------------------------------
@app.post("/payments/webhook")
async def webhook_pagamentos(request: Request, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Recebe notificações do Asaas e atualiza o status do pedido correspondente.

    O Asaas manda o mesmo payload para vários eventos (PAYMENT_CREATED,
    PAYMENT_RECEIVED, etc). Tratamos só as transições que nos interessam.
    """
    try:
        corpo = await request.json()
    except Exception:
        corpo = {}

    evento = payments.parse_webhook(corpo) if isinstance(corpo, dict) else None
    if not evento:
        return {"status": "ignored"}

    pedido = (
        db.query(models.Order)
        .filter(models.Order.mp_payment_id == evento["payment_id"])
        .first()
    )
    if not pedido:
        return {"status": "unknown_payment"}

    if evento["status"] == "approved" and pedido.status != "pago":
        pedido.status = "pago"
        db.commit()
    elif evento["status"] == "cancelled" and pedido.status != "cancelado":
        pedido.status = "cancelado"
        db.commit()

    return {"status": "ok", "order_status": pedido.status}
