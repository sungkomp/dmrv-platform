#!/bin/bash
# Auto-restarting Next.js dev server daemon
cd /home/z/my-project
while true; do
  echo "[$(date)] Starting Next.js dev server..." >> /tmp/server-daemon.log
  npx next dev -p 3000 -H 0.0.0.0 2>&1 | tee -a /home/z/my-project/dev.log
  EXIT_CODE=${PIPESTATUS[0]}
  echo "[$(date)] Server exited with code $EXIT_CODE, restarting in 5s..." >> /tmp/server-daemon.log
  sleep 5
done
