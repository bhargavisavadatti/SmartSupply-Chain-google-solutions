# SmartSupply Chain
### Google Solutions Build with AI — Hackathon Submission

## Problem Statement
Smart Supply Chains: Resilient Logistics and 
Dynamic Supply Chain Optimization

## Our Solution
SmartSupply Chain is an AI-powered web platform that detects 
supply chain disruptions, calculates their exact financial 
impact in rupees using Google Gemini AI, and recommends 
the most cost-efficient action to take next.

## USP
We don't just detect disruptions — we quantify exactly 
what they cost you and tell you the smartest financial 
move next.

## Live Demo
Prototype: https://finsmart-supply.web.app

## Tech Stack
### Frontend
- HTML5, CSS3, Vanilla JavaScript

### AI / Machine Learning
- Google Gemini API (gemini-pro)
  - Route risk analysis
  - Financial impact calculation
  - AI recommendations
  - Supplier health scoring
  - Cash flow insights

### Maps & Location
- Leaflet.js — interactive map rendering
- OpenStreetMap + CARTO — map tiles
- Custom weather overlays on routes

### Database & Backend
- Firebase Firestore — real-time NoSQL database
- Firebase Hosting — cloud deployment

### Data Visualization
- Chart.js — cash flow forecast graphs
- Custom donut chart — exposure breakdown

### Deployment
- Google Cloud via Firebase Hosting


## Features
- Live shipment map with color coded risk status
- Real-time weather overlays on routes
- Route planner with Gemini AI recommendations
- Financial impact calculator
- Cash flow forecast with disruption overlay
- Supplier health scorecard powered by Gemini
- Three role-based views — SCM, Finance, Executive
- Decision logging to Firebase Firestore

## Pages
- index_supply.html — Login with role selection
- map_supply.html — Live shipment map
- dashboard_supply.html — Shipment overview
- finance_supply.html — Financial analytics
- forecast_supply.html — Cash flow forecast
- supplier_supply.html — Supplier scorecard
- route_supply.html — Route planner

## How to Run Locally
1. Clone this repository
2. Open firebase_supply.js
3. Paste your Firebase config
4. Paste your Gemini API key
5. Open index_supply.html with Live Server

## Team
- Team Name: SmartSupply Chain
- Event: Google Solutions Build with AI 2026
