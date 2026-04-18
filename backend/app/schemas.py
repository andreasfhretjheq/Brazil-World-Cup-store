from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    name: str

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ProductOut(BaseModel):
    id: int
    name: str
    description: str
    price: float
    image_url: str
    category: str
    stock: int
    sizes: str
    featured: int

    class Config:
        from_attributes = True


class CartItemCreate(BaseModel):
    product_id: int
    quantity: int = 1
    size: str = "M"


class CartItemUpdate(BaseModel):
    quantity: Optional[int] = None
    size: Optional[str] = None


class CartItemOut(BaseModel):
    id: int
    product_id: int
    quantity: int
    size: str
    product: ProductOut

    class Config:
        from_attributes = True


class OrderItemOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    product_image: str
    unit_price: float
    quantity: int
    size: str

    class Config:
        from_attributes = True


class OrderCreate(BaseModel):
    shipping_address: str
    payment_method: str


class OrderOut(BaseModel):
    id: int
    total: float
    status: str
    shipping_address: str
    payment_method: str
    created_at: datetime
    items: List[OrderItemOut]
    mp_payment_id: Optional[str] = None
    pix_qr_code: Optional[str] = None
    pix_qr_code_base64: Optional[str] = None
    pix_ticket_url: Optional[str] = None

    class Config:
        from_attributes = True
