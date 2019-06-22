import { Product } from '../product/product.model';
// import { Picture } from '../picture.model';
import { Address } from '../entity.model';
import { Restaurant } from '../restaurant/restaurant.model';
import { ILocation } from '../location/location.model';



export interface IOrder {
  id?: string;
  code?: string;
  clientId?: string;
  clientName?: string;
  clientPhoneNumber?: string;
  prepaidClient?: boolean;
  clientBalance?: number;
  merchantId?: string;
  merchantName?: string;
  driverId?: string;
  driverName?: string;
  status?: string;
  paid?: boolean;
  note?: string;
  address?: string;
  location?: ILocation;
  delivered?: Date;
  created?: Date;
  modified?: Date;
  items?: IOrderItem[];
  deliveryAddress?: Address;
  deliveryCost?: number;
  deliveryFee?: number;
  deliveryDiscount?: number;
  total?: number;
  received?: number; // 2019-05-29
  balance?: number;
  receivable?: number;
}

export class Order implements IOrder {
  id: string;
  clientId: string;
  clientName: string;
  clientPhoneNumber?: string;
  prepaidClient?: boolean;
  clientBalance?: number;
  merchantId: string;
  merchantName: string;
  driverId: string;
  driverName?: string;
  status: string;
  note: string;
  address: string;
  location?: ILocation;
  delivered: Date;
  created: Date;
  modified: Date;
  items: OrderItem[];
  deliveryAddress: Address;
  deliveryCost?: number;
  deliveryFee: number;
  deliveryDiscount: number;
  total: number;
  balance?: number;
  constructor(data?: IOrder) {
    Object.assign(this, data);
  }
}

export interface IOrderItem {
  id?: number;
  productId: string;
  productName: string;
  merchantId: string;
  merchantName: string;
  price: number;
  cost?: number;
  quantity: number;
}

export class OrderItem implements IOrderItem {
  id: number;
  productId: string;
  productName: string;
  merchantId: string;
  merchantName: string;
  price: number;
  cost?: number;
  quantity: number;
  constructor(data?: IOrderItem) {
    Object.assign(this, data);
  }
}
