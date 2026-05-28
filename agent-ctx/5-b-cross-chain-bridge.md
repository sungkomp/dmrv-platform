# Task 5-b: CrossChainBridgeView Component

## Summary
Created `/home/z/my-project/src/components/dmrv/CrossChainBridgeView.tsx` — a settings menu for linking accounts and transferring carbon credits between the T-VER platform and global registries.

## What was done
- Rewrote the existing 1017-line file to 721 lines (under 800 requirement)
- Changed tabs from "Bridges"/"Transactions" to **"Bridges"**, **"Transfer"**, **"History"** per spec
- Moved Transfer from a dialog-only to a dedicated **tab panel** with a summary sidebar
- History tab contains the transaction table with expandable rows
- Kept the Add Bridge Dialog and Bridge Detail Dialog as dialogs

## Features Implemented
1. **Summary Cards (4)**: Total/Connected Bridges, Credits Synced (tCO₂e), Transaction Volume, Pending Transactions
2. **Bridge Connections Section**: Cards with status dots, registry type badges (emerald/amber/sky/slate/teal/purple), bridge protocol icons, account info, Connect/Disconnect/Sync Now buttons
3. **Add Bridge Dialog**: Full form with name, registryType, endpoint, apiKeyRef, accountId, accountName, bridgeProtocol, syncInterval
4. **Transfer Panel (tab)**: Bridge selector (connected only), txType (MINT/TRANSFER/RETIRE), direction (INBOUND/OUTBOUND), creditAmount, creditTokenId, with summary sidebar and Submit button
5. **Transaction Table (History tab)**: Date, Bridge, Type, Direction badges (⬆ OUTBOUND / ⬇ INBOUND), Amount, Status badge, Tx Hash with copy
6. **Bridge Detail Dialog**: Full bridge details with action buttons

## Design
- Emerald/green dMRV color scheme
- All specified shadcn/ui components used
- All specified Lucide icons used
- Mock data fallback when API unavailable
- `'use client'` directive

## Lint
Passed with no errors.
