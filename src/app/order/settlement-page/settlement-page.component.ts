import { Component, OnInit, OnDestroy } from '@angular/core';
import { IAccount, Role } from '../../account/account.model';
import { AccountService } from '../../account/account.service';
import { SharedService } from '../../shared/shared.service';
import { MerchantService } from '../../restaurant/restaurant.service';
import { ActivatedRoute, Router } from '../../../../node_modules/@angular/router';
import { IMerchant, MerchantType, MerchantStatus } from '../../restaurant/restaurant.model';
import { Subject } from '../../../../node_modules/rxjs';
import { takeUntil } from '../../../../node_modules/rxjs/operators';
import * as moment from 'moment';

@Component({
  selector: 'app-settlement-page',
  templateUrl: './settlement-page.component.html',
  styleUrls: ['./settlement-page.component.scss']
})
export class SettlementPageComponent implements OnInit, OnDestroy {

  account: IAccount;
  rangeDay;
  rangeWeek;
  rangeMonth;
  onDestroy$ = new Subject();
  restaurant: IMerchant;
  deliverTime;

  constructor(
    private merchantSvc: MerchantService,
    private sharedSvc: SharedService,
    private accountSvc: AccountService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    const dayStart = this.sharedSvc.getStartOf('day').toDate();
    const dayEnd = this.sharedSvc.getEndOf('day').toDate();
    const weekStart = this.sharedSvc.getStartOf('week').toDate();
    const weekEnd = this.sharedSvc.getEndOf('week').toDate();
    const monthStart = this.sharedSvc.getStartOf('month').toDate();
    const monthEnd = this.sharedSvc.getEndOf('month').toDate();

    this.rangeDay = { $lt: dayEnd, $gt: dayStart};
    this.rangeWeek = { $lt: weekEnd, $gt: weekStart};
    this.rangeMonth = { $lt: monthEnd, $gt: monthStart};

    const now = moment();
    const timeEnd = this.sharedSvc.getStartOf('day').set({ hour: 19, minute: 30, second: 0, millisecond: 0 });

    if (now.isAfter(dayEnd)) {
      this.deliverTime = this.sharedSvc.getStartOf('day').add(1, 'days')
        .set({ hour: 11, minute: 45, second: 0, millisecond: 0 })
        .format('YYYY-MM-DD HH:mm:ss');
    } else {
      this.deliverTime = this.sharedSvc.getStartOf('day')
        .set({ hour: 11, minute: 45, second: 0, millisecond: 0 })
        .format('YYYY-MM-DD HH:mm:ss');
    }
  }

  ngOnInit() {
    const self = this;
    const q = { status: MerchantStatus.ACTIVE, type: MerchantType.RESTAURANT };
    self.accountSvc.getCurrentAccount().pipe(takeUntil(this.onDestroy$)).subscribe(account => {
        const roles = account.roles;
        if (roles && roles.length > 0 && roles.indexOf(Role.DRIVER) !== -1) {
          self.merchantSvc.find(q).pipe(takeUntil(this.onDestroy$)).subscribe((rs: IMerchant[]) => {
            if (rs && rs.length > 0) {
              self.restaurant = rs[0];
            } else {
              self.restaurant = null;
            }
          });
        } else { // not authorized for opreration merchant
          this.router.navigate(['account/setting'], { queryParams: { merchant: false } });
        }
    });

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
  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }
  onSelect(c) {
    // this.select.emit({ order: c });
  }

  toDateTimeString(s) {
    return s ? this.sharedSvc.toDateTimeString(s) : '';
  }
}
