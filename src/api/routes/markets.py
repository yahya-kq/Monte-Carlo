"""Market metadata and historical stock data routes."""

from fastapi import APIRouter, Depends, Query
from src.api.dependencies import get_data_service
from src.api.schemas import (
    AssetItem,
    AssetsResponse,
    DataQualityReportSchema,
    MarketDataResponse,
    MarketInfo,
    MarketsResponse,
    OHLCVRecord,
)
from src.config import settings
from src.data.data_service import DataService
from src.domain.models import MarketType

router = APIRouter(tags=["Markets & Assets"])


@router.get("/markets", response_model=MarketsResponse)
def get_markets(data_service: DataService = Depends(get_data_service)) -> MarketsResponse:
    """List available markets and their data source capabilities."""
    intl_provider = data_service.get_provider(MarketType.INTERNATIONAL)
    psx_provider = data_service.get_provider(MarketType.PSX)

    intl_assets = data_service.get_available_assets(MarketType.INTERNATIONAL)
    psx_assets = data_service.get_available_assets(MarketType.PSX)

    return MarketsResponse(
        markets=[
            MarketInfo(
                id=MarketType.INTERNATIONAL,
                name="International Equity Markets",
                exchange="NASDAQ / NYSE (US)",
                currency="USD",
                data_provider=intl_provider.provider_name,
                available_stocks=len(intl_assets),
                default_trading_days=settings.trading_days_international,
            ),
            MarketInfo(
                id=MarketType.PSX,
                name="Pakistan Stock Exchange (PSX)",
                exchange="PSX (Karachi)",
                currency="PKR",
                data_provider=psx_provider.provider_name,
                available_stocks=len(psx_assets),
                default_trading_days=settings.trading_days_psx,
            ),
        ]
    )


@router.get("/assets/{market}", response_model=AssetsResponse)
def get_assets_by_market(
    market: MarketType,
    data_service: DataService = Depends(get_data_service),
) -> AssetsResponse:
    """Retrieve the configured stock universe for a market."""
    assets_dict = data_service.get_available_assets(market)
    asset_items = [
        AssetItem(
            symbol=a.symbol,
            name=a.name,
            sector=a.sector,
            exchange=a.exchange,
            currency=a.currency,
            market=a.market,
            description=a.description,
        )
        for a in assets_dict.values()
    ]
    return AssetsResponse(
        market=market,
        total_count=len(asset_items),
        count=len(asset_items),
        assets=asset_items,
    )


@router.get("/market-data/{market}", response_model=MarketDataResponse)
async def get_historical_market_data(
    market: MarketType,
    symbol: str | None = Query(None, description="Single stock symbol query"),
    symbols: list[str] | None = Query(None, description="Multiple symbols query"),
    start_date: str | None = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: str | None = Query(None, description="End date (YYYY-MM-DD)"),
    period: str = Query("1y", description="Historical period if start/end date omitted"),
    data_service: DataService = Depends(get_data_service),
) -> MarketDataResponse:
    """Fetch historical price series for specified symbol(s) or default market stocks."""
    target_symbols = []
    if symbol:
        target_symbols = [symbol.strip().upper()]
    elif symbols:
        target_symbols = [s.strip().upper() for s in symbols]
    else:
        target_symbols = list(data_service.get_available_assets(market).keys())

    # If single symbol requested, get full OHLCV records
    if len(target_symbols) == 1:
        single_sym = target_symbols[0]
        df = await data_service.get_single_asset_data(
            symbol=single_sym,
            market=market,
            start_date=start_date,
            end_date=end_date,
        )
        records = [
            OHLCVRecord(
                date=idx.strftime("%Y-%m-%d"),
                open=round(float(row.get("open", row["close"])), 4),
                high=round(float(row.get("high", row["close"])), 4),
                low=round(float(row.get("low", row["close"])), 4),
                close=round(float(row["close"]), 4),
                adj_close=round(float(row.get("adj_close", row["close"])), 4),
                volume=round(float(row.get("volume", 0.0)), 2),
            )
            for idx, row in df.iterrows()
        ]
        dates = [r.date for r in records]
        close_prices = {single_sym: [r.close for r in records]}

        return MarketDataResponse(
            market=market,
            symbol=single_sym,
            symbols=[single_sym],
            records_count=len(records),
            data=records,
            dates=dates,
            close_prices=close_prices,
        )

    # Multi-symbol aligned view
    prices_df, quality_report = await data_service.get_aligned_prices(
        symbols=target_symbols,
        market=market,
        start_date=start_date,
        end_date=end_date,
    )

    dates = [d.strftime("%Y-%m-%d") for d in prices_df.index]
    prices_dict = {col: prices_df[col].round(4).tolist() for col in prices_df.columns}

    report_schema = DataQualityReportSchema(
        market=quality_report.market,
        requested_symbols=quality_report.requested_symbols,
        resolved_symbols=quality_report.resolved_symbols,
        failed_symbols=quality_report.failed_symbols,
        start_date=quality_report.start_date,
        end_date=quality_report.end_date,
        total_calendar_days=quality_report.total_calendar_days,
        aligned_trading_days=quality_report.aligned_trading_days,
        dropped_dates_count=quality_report.dropped_dates_count,
        used_series=quality_report.used_series,
        data_source=quality_report.data_source,
        warnings=quality_report.warnings,
    )

    return MarketDataResponse(
        market=market,
        symbol=target_symbols[0] if target_symbols else None,
        symbols=list(prices_df.columns),
        records_count=len(dates),
        dates=dates,
        close_prices=prices_dict,
        quality_report=report_schema,
    )
