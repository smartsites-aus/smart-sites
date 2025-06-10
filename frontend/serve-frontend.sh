#!/bin/bash
cd "$(dirname "$0")"
npm run build
npx serve -s dist -l 3000
