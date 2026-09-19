import { DynamicModule, Module, Provider, Global } from "@nestjs/common";
import { APP_INTERCEPTOR, APP_FILTER } from "@nestjs/core";
import {
  NestObservabilityOptions,
  ObservabilityAsyncOptions,
  ObservabilityOptionsFactory,
  OBSERVABILITY_OPTIONS,
} from "./interfaces.js";
import { ObservabilityInterceptor } from "./observability.interceptor.js";
import { ObservabilityExceptionFilter } from "./observability.filter.js";
import { ObservabilityController } from "./observability.controller.js";
import { initTracing } from "../core/tracing.js";
import { setCrashLogAdaptor } from "../core/logger.js";

@Global()
@Module({})
export class ObservabilityModule {
  /**
   * Configure Observability synchronously.
   */
  static forRoot(options: NestObservabilityOptions = {}): DynamicModule {
    if (options.autoInitTracing !== false) {
      initTracing(options);
    }

    if (options.crashLogAdaptor) {
      setCrashLogAdaptor(options.crashLogAdaptor);
    }

    const optionsProvider: Provider = {
      provide: OBSERVABILITY_OPTIONS,
      useValue: options,
    };

    const interceptorProvider: Provider = {
      provide: APP_INTERCEPTOR,
      useClass: ObservabilityInterceptor,
    };

    const filterProvider: Provider = {
      provide: APP_FILTER,
      useClass: ObservabilityExceptionFilter,
    };

    return {
      module: ObservabilityModule,
      controllers: [ObservabilityController],
      providers: [
        optionsProvider,
        interceptorProvider,
        filterProvider,
        ObservabilityInterceptor,
        ObservabilityExceptionFilter,
      ],
      exports: [optionsProvider, ObservabilityInterceptor, ObservabilityExceptionFilter],
    };
  }

  /**
   * Configure Observability asynchronously (e.g. injecting ConfigService).
   */
  static forRootAsync(asyncOptions: ObservabilityAsyncOptions): DynamicModule {
    const asyncProviders = this.createAsyncProviders(asyncOptions);

    const interceptorProvider: Provider = {
      provide: APP_INTERCEPTOR,
      useClass: ObservabilityInterceptor,
    };

    const filterProvider: Provider = {
      provide: APP_FILTER,
      useClass: ObservabilityExceptionFilter,
    };

    return {
      module: ObservabilityModule,
      imports: asyncOptions.imports || [],
      controllers: [ObservabilityController],
      providers: [
        ...asyncProviders,
        interceptorProvider,
        filterProvider,
        ObservabilityInterceptor,
        ObservabilityExceptionFilter,
      ],
      exports: [OBSERVABILITY_OPTIONS, ObservabilityInterceptor, ObservabilityExceptionFilter],
    };
  }

  private static createAsyncProviders(
    options: ObservabilityAsyncOptions
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }

    if (options.useClass) {
      return [
        this.createAsyncOptionsProvider(options),
        {
          provide: options.useClass,
          useClass: options.useClass,
        },
      ];
    }

    return [];
  }

  private static createAsyncOptionsProvider(
    options: ObservabilityAsyncOptions
  ): Provider {
    if (options.useFactory) {
      return {
        provide: OBSERVABILITY_OPTIONS,
        useFactory: async (...args: any[]) => {
          const opts = await options.useFactory!(...args);
          if (opts?.autoInitTracing !== false) {
            initTracing(opts);
          }
          return opts;
        },
        inject: options.inject || [],
      };
    }

    const injectClass = options.useExisting || options.useClass;
    return {
      provide: OBSERVABILITY_OPTIONS,
      useFactory: async (optionsFactory: ObservabilityOptionsFactory) => {
        const opts = await optionsFactory.createObservabilityOptions();
        if (opts?.autoInitTracing !== false) {
          initTracing(opts);
        }
        return opts;
      },
      inject: injectClass ? [injectClass] : [],
    };
  }
}
