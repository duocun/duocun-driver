import { Component, OnInit, Input, OnDestroy, OnChanges } from '@angular/core';
import { IRestaurant } from '../../restaurant/restaurant.model';
import { IOrder, IOrderItem } from '../order.model';
import { OrderService } from '../order.service';
import { SharedService } from '../../shared/shared.service';
import { Subject } from '../../../../node_modules/rxjs';
import { takeUntil } from '../../../../node_modules/rxjs/operators';
import { ILocation } from '../../location/location.model';
import { IMall } from '../../mall/mall.model';
import { LocationService } from '../../location/location.service';
import { AccountService } from '../../account/account.service';
import { IAccount } from '../../account/account.model';
import { MatSnackBar, MatDialog } from '../../../../node_modules/@angular/material';
import { AssignmentService } from '../../assignment/assignment.service';
import { FormBuilder } from '../../../../node_modules/@angular/forms';
import * as moment from 'moment';
import { Router } from '../../../../node_modules/@angular/router';
import { ReceiveCashDialogComponent } from '../receive-cash-dialog/receive-cash-dialog.component';
import { ICommand } from '../../shared/command.reducers';
import { NgRedux } from '../../../../node_modules/@angular-redux/store';
import { IAppState } from '../../store';

@Component({
  selector: 'app-order-pack',
  templateUrl: './order-pack.component.html',
  styleUrls: ['./order-pack.component.scss']
})
export class OrderPackComponent implements OnInit, OnDestroy, OnChanges {

  @Input() assignments;
  @Input() pickupTime;

  @Input() restaurant: IRestaurant;
  @Input() delivered; // moment object

  orders: IOrder[] = [];
  list: IOrderItem[];
  ordersWithNote: IOrder[] = [];
  onDestroy$ = new Subject();
  // assignments;
  forms = {};
  accounts = [];
  groups = [];
  clientIds = [];
  pickups = [];
  account;

  constructor(
    private orderSvc: OrderService,
    private sharedSvc: SharedService,
    private accountSvc: AccountService,
    private router: Router,
    private locationSvc: LocationService,
    private assignmentSvc: AssignmentService,
    private snackBar: MatSnackBar,
    private fb: FormBuilder,
    private rx: NgRedux<IAppState>,
    public dialog: MatDialog
  ) {
    const self = this;
  }

  ngOnInit() {
    const self = this;

    this.rx.select<ICommand>('cmd').pipe(takeUntil(this.onDestroy$)).subscribe((x: ICommand) => {
      if (x.name === 'reload-orders') {
        const q = { _id: { $in: self.clientIds } };
        self.accountSvc.quickFind(q).pipe(takeUntil(this.onDestroy$)).subscribe((accounts: IAccount[]) => {
          self.accounts = accounts;
          self.reload(accounts, this.pickupTime);
        });
      }
    });

    const xs = this.assignments;
    this.accountSvc.getCurrentUser().pipe(takeUntil(this.onDestroy$)).subscribe(account => {
      self.account = account;
      if (account) {
        if (xs) {
          self.clientIds = this.sharedSvc.getDistinctValues(xs, 'clientId');
          const q = { _id: { $in: self.clientIds } };
          self.accountSvc.find(q).pipe(takeUntil(this.onDestroy$)).subscribe((accounts: IAccount[]) => {
            self.accounts = accounts;
            self.reload(accounts, this.pickupTime);
          });
        }
      } else {
        this.router.navigate(['account/login']);
      }
    });

    // setTimeout(() => {
    //   self.reload();
    // }, 2000);

    // this.socketSvc.on('updateOrders', x => {
    //   // self.onFilterOrders(this.selectedRange);
    //   if (x.clientId === self.account.id) {
    //     const index = self.orders.findIndex(i => i.id === x.id);
    //     if (index !== -1) {
    //       self.orders[index] = x;
    //     } else {
    //       self.orders.push(x);
    //     }
    //     self.orders.sort((a: Order, b: Order) => {
    //       if (this.sharedSvc.compareDateTime(a.created, b.created)) {
    //         return -1;
    //       } else {
    //         return 1;
    //       }
    //     });
    //   }
    // });
  }


  ngOnChanges(v) {
    const self = this;
    if (v.assignments && v.assignments.currentValue) {
      const xs = v.assignments.currentValue;
      // this.reload(restaurant._id);
      self.clientIds = this.sharedSvc.getDistinctValues(xs, 'clientId');
      if (self.clientIds && self.clientIds.length > 0) {
        const q = { _id: { $in: self.clientIds } };
        self.accountSvc.quickFind(q).pipe(takeUntil(this.onDestroy$)).subscribe((accounts: IAccount[]) => {
          self.accounts = accounts;
          self.reload(accounts, this.pickupTime);
        });
      }
    }
  }

  // return array of {merchantId: x, merchantName: x, items: [{order:x, status: x}, ... ]}
  groupByMerchants(accounts: IAccount[], orders: IOrder[], assignments: any[]) {
    const groupedByMerchants = [];
    orders.map(order => {
      const grp = groupedByMerchants.find(m => m.merchantId === order.merchantId);
      const assignment = assignments.find(a => a.orderId === order._id);
      const account = accounts.find(a => a._id === order.clientId);
      if (assignment) {
        const code = assignment ? assignment.code : 'N/A';
        const status = assignment ? assignment.status : 'new';

        const balance = account.balance;

        if (!grp) {
          const item = { balance: balance, order: order, code: code, status: status, paid: (order.status === 'paid') };
          groupedByMerchants.push({ merchantId: order.merchantId, merchantName: order.merchantName, items: [item] });
        } else {
          grp.items.push({ balance: balance, order: order, code: code, status: status, paid: (order.status === 'paid') });
        }
      }
    });
    return groupedByMerchants;
  }

  getQuantity(order: IOrder) {
    let quantity = 0;
    order.items.map((item: IOrderItem) => {
      quantity += item.quantity;
    });
    return quantity;
  }


  // pickupTime --- eg. '11:20'
  reload(accounts: IAccount[], pickupTime: string) {
    const self = this;
    const accountId = this.account._id;
    const os = [];
    const range = { $gt: moment().startOf('day').toISOString(), $lt: moment().endOf('day').toISOString() };

    const orderQuery = { pickup: pickupTime, status: { $nin: ['del', 'bad', 'tmp'] } };
    const assignmentQuery = { delivered: range, driverId: accountId };
    this.assignmentSvc.quickFind(assignmentQuery).pipe(takeUntil(this.onDestroy$)).subscribe(assignments => {
      this.assignments = assignments;
      this.orderSvc.find(orderQuery).pipe(takeUntil(this.onDestroy$)).subscribe((orders: IOrder[]) => {
        this.forms = {};
        self.groups = this.groupByMerchants(accounts, orders, this.assignments);
      });
    });
  }

  onSelect(c) {
    // this.select.emit({ order: c });
  }

  toDateTimeString(s) {
    return s ? this.sharedSvc.toDateTimeString(s) : '';
  }

  // ngOnChanges(v) {
  //   // this.reload();
  //   const self = this;
  //   self.accountSvc.getCurrentUser().pipe(
  //     takeUntil(this.onDestroy$)
  //   ).subscribe(account => {
  //     self.account = account;
  //     self.assignmentSvc.find({ where: { driverId: account.id } }).pipe(takeUntil(self.onDestroy$)).subscribe(xs => {
  //       self.assignments = xs;
  //       self.reload(xs);
  //     });
  //   });
  // }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  navigateTo(location: ILocation) {
    (<any>window).location = encodeURI('https://www.google.com/maps/dir/?api=1&destination=' +
      + location.streetNumber + '+' + location.streetName + '+'
      + (location.subLocality ? location.subLocality : location.city) + '+'
      + location.province
      + '&destination_placeId=' + location.placeId);
  }

  patition(orders: IOrder[], malls: IMall[]) {
    const groupedOrders = [];
    orders.map((order: IOrder) => {
      const row = [];
      let shortest = this.locationSvc.getDirectDistance(order.location, { lat: malls[0].lat, lng: malls[0].lng });
      let selectedMall = malls[0];

      malls.map((mall: IMall) => {
        const distance = this.locationSvc.getDirectDistance(order.location, { lat: mall.lat, lng: mall.lng });
        if (shortest > distance) {
          selectedMall = mall;
          shortest = distance;
        }
      });
      groupedOrders.push({ order: order, mall: selectedMall, distance: shortest });
    });
    return groupedOrders;
  }

  // deprecated
  togglePaid(e, order: IOrder) {
    // const self = this;
    // const toId = this.account._id;
    // const toName = this.account.username;
    // const received = Math.round(+this.forms[order._id].get('received').value * 100) / 100;
    // order.received = received;

    // this.clientPaymentSvc.pay(toId, toName, received, order._id, '').pipe(takeUntil(this.onDestroy$)).subscribe((r) => {
    //   self.snackBar.open('', '余额已更新', { duration: 1800 });
    //   const q1 = { accountId: { $in: self.clientIds } };
    //   self.accountSvc.quickFind(q1).pipe(takeUntil(this.onDestroy$)).subscribe((cbs: IAccount[]) => {
    //     self.accounts = cbs;
    //     self.reload(cbs, this.pickupTime);
    //   });
    // });

    // this.savePayment(received, order);
  }


  // savePayment(received: number, order: IOrder) {
  //   const clientPayment: IClientPayment = {
  //     orderId: order._id,
  //     clientId: order.clientId,
  //     clientName: order.clientName,
  //     driverId: this.account.id,
  //     driverName: this.account.username,
  //     amount: received,
  //     type: 'credit',
  //     delivered: order.delivered,
  //     created: new Date(),
  //     modified: new Date(),
  //   };

  //   this.clientPaymentSvc.save(clientPayment).pipe(takeUntil(this.onDestroy$)).subscribe(x => {
  //     this.snackBar.open('', '已保存客户的付款', { duration: 2300 });
  //   });
  // }


  openReceiveCashDialog(order: IOrder) {
    const orderId = order._id;
    const params = {
      width: '300px',
      data: {
        title: '收款', content: '', buttonTextNo: '取消', buttonTextYes: '确认收款',
        orderId: orderId, accountId: this.account._id, accountName: this.account.username
      },
      panelClass: 'receive-cash-dialog'
    };
    const dialogRef = this.dialog.open(ReceiveCashDialogComponent, params);

    dialogRef.afterClosed().pipe(takeUntil(this.onDestroy$)).subscribe(result => {

    });
  }

  finishDelivery(order: IOrder) {
    this.assignmentSvc.update({ orderId: order._id }, { status: 'done' }).pipe(takeUntil(this.onDestroy$)).subscribe(() => {
      this.snackBar.open('', '此订单已完成', { duration: 1800 });
        this.reload(this.accounts, this.pickupTime);
    });
  }
}
