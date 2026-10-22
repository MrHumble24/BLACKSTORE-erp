import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { AccessoryStockModule } from './accessory-stock/accessory-stock.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { BatchesModule } from './batches/batches.module';
import { CategoriesModule } from './categories/categories.module';
import { CustomersModule } from './customers/customers.module';
import { ItemsModule } from './items/items.module';
import { PrismaExceptionFilter } from './common/prisma-exception.filter';
import { validateEnv } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { InvestorsModule } from './investors/investors.module';
import { LedgerModule } from './ledger/ledger.module';
import { LocationsModule } from './locations/locations.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductModelsModule } from './product-models/product-models.module';
import { StockCountsModule } from './stock-counts/stock-counts.module';
import { SalesModule } from './sales/sales.module';
import { SettingsModule } from './settings/settings.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { TransfersModule } from './transfers/transfers.module';
import { UsersModule } from './users/users.module';
import { WalkInPurchasesModule } from './walk-in-purchases/walk-in-purchases.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    AuditModule,
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
    SettingsModule,
    HealthModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: PrismaExceptionFilter }],
})
export class AppModule {}
