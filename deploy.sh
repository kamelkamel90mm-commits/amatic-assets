#!/bin/bash
# Script to deploy the casino to Surge
echo "Deploying to Surge..."
npx surge dist --domain poseidon-casino-kamel.surge.sh
