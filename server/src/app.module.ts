import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AccessoryStockModule } from './accessory-stock/accessory-stock.module';
import { AuditModule } from './audit/audit.module';
import { BackupsModule } from './backups/backups.module';
import { AuthModule } from './auth/auth.module';
import { BatchesModule } from './batches/batches.module';
import { BusinessDayModule } from './business-day/business-day.module';
import { CategoriesModule } from './categories/categories.module';
import { ConsignmentsModule } from './consignments/consignments.module';
import { CustomerNotificationsModule } from './customer-notifications/customer-notifications.module';
import { CustomersModule } from './customers/customers.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { InvestorNotificationsModule } from './investor-notifications/investor-notifications.module';
import { ItemsModule } from './items/items.module';
import { PrismaExceptionFilter } from './common/prisma-exception.filter';
import { validateEnv } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { InvestorsModule } from './investors/investors.module';
import { LedgerModule } from './ledger/ledger.module';
import { LocationsModule } from './locations/locations.module';
import { PartnersModule } from './partners/partners.module';
import { TelegramBotModule } from './telegram-bot/telegram-bot.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductModelsModule } from './product-models/product-models.module';
import { ReportsModule } from './reports/reports.module';
import { StockCountsModule } from './stock-counts/stock-counts.module';
import { SalesModule } from './sales/sales.module';
import { SettingsModule } from './settings/settings.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { TransfersModule } from './transfers/transfers.module';
import { UsersModule } from './users/users.module';
import { WalkInPurchasesModule } from './walk-in-purchases/walk-in-purchases.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuditModule,
    BackupsModule,
    AuthModule,
    UsersModule,
    LocationsModule,
    CategoriesModule,
    ProductModelsModule,
    InvestorsModule,
    ItemsModule,
    AccessoryStockModule,
    SuppliersModule,
    BatchesModule,
    WalkInPurchasesModule,
    TransfersModule,
    StockCountsModule,
    LedgerModule,
    CustomersModule,
    SalesModule,
    CustomerNotificationsModule,
    InvestorNotificationsModule,
    PartnersModule,
    ConsignmentsModule,
    ReportsModule,
    DashboardModule,
    SettingsModule,
    IntegrationsModule,
    TelegramBotModule,
    BusinessDayModule,
    SuperAdminModule,
    HealthModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: PrismaExceptionFilter }],
})
export class AppModule {}
