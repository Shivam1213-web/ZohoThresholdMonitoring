# Zoho Books Threshold Monitoring

Automated monitoring scripts for Zoho Books (US edition) that track:

1. **Sales Tax Economic Nexus Thresholds** — by state, per the Wayfair ruling
2. **1099 Vendor Payment Thresholds** — $600 IRS filing requirement

## What These Scripts Do

### Nexus Threshold Monitor (`scripts/nexus-threshold-monitor.deluge`)
- Pulls all paid invoices for the current calendar year
- Aggregates revenue and transaction count by ship-to state
- Compares against each state's economic nexus threshold
- Handles OR/AND/REVENUE_ONLY threshold conditions
- Sends email alerts at 80% (warning) and 100% (exceeded)
- Includes a full state-by-state summary table

### 1099 Vendor Monitor (`scripts/vendor-1099-monitor.deluge`)
- Pulls all vendor payments for the current tax year
- Aggregates by vendor
- Flags vendors exceeding $600 (1099-NEC threshold)
- Identifies vendors NOT marked as 1099-eligible who should be
- Highlights missing W-9/TIN information
- Sends email alerts at ~$500 (warning) and $600 (exceeded)

## Project Structure

```
ZohoThreasholdMonitoring/
├── README.md                              # This file
├── scripts/
│   ├── nexus-threshold-monitor.deluge     # Sales tax nexus monitoring
│   └── vendor-1099-monitor.deluge         # 1099 vendor payment monitoring
├── config/
│   └── state-nexus-thresholds.json        # Reference: all state thresholds
└── docs/
    └── setup-guide.md                     # Step-by-step setup instructions
```

## Quick Start

1. Read `docs/setup-guide.md` for full instructions
2. Find your Zoho Books Organization ID
3. Set up a Zoho Books API connection named `zohobooks`
4. Create scheduled functions in Zoho Books with each script
5. Configure the org ID and email addresses in each script
6. Schedule weekly execution

## Requirements

- Zoho Books US edition (Standard plan or higher)
- Admin access to Zoho Books
- Custom Functions capability (included in Standard+)

## State Threshold Reference

See `config/state-nexus-thresholds.json` for the full list of state economic nexus thresholds. Notable variations:

| State | Revenue Threshold | Transaction Threshold | Condition |
|-------|------------------:|---------------------:|-----------|
| Most states | $100,000 | 200 | OR |
| California | $500,000 | N/A | Revenue only |
| Texas | $500,000 | N/A | Revenue only |
| New York | $500,000 | 100 | AND (both required) |
| Connecticut | $100,000 | 200 | AND (both required) |
| Alabama | $250,000 | N/A | Revenue only (SSUT) |

5 states have no sales tax: DE, MT, NH, OR, AK

## Disclaimer

These scripts are provided as-is for informational purposes. Tax thresholds change — verify current thresholds with your state revenue departments and the IRS before relying on these scripts for compliance decisions. Consult a tax professional for advice specific to your situation.
