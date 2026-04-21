// ============================================
// gemini_supply.js
// All Gemini AI prompt functions with fallbacks
// ============================================

/**
 * Core Gemini API caller
 * @param {string} prompt
 * @returns {Promise<string>} raw text response
 */
async function callGemini(prompt) {
  const response = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Strip markdown code fences if present
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

  return text;
}

// ============================================================
// Prompt 1 — Disruption Analysis
// ============================================================

/**
 * Analyse a disruption in plain English
 * @param {Object} shipment
 * @returns {Promise<{success: boolean, summary: string}>}
 */
async function analyseDisruption(shipment) {
  const prompt = `You are a supply chain expert. Analyse this shipment disruption concisely in exactly 3 sentences.

Shipment Details:
- Route: ${shipment.origin} → ${shipment.destination}
- Goods: ${shipment.goods}
- Value: ₹${shipment.value.toLocaleString('en-IN')}
- Disruption: ${shipment.disruption}
- Delay: ${shipment.delayDays} day(s)
- Supplier: ${shipment.supplier}

Provide a clear, professional 3-sentence analysis covering: (1) what happened, (2) immediate impact, (3) urgency level. Use plain English, no bullet points.`;

  try {
    const summary = await callGemini(prompt);
    return { success: true, summary };
  } catch (err) {
    console.error('analyseDisruption error:', err);
    return {
      success: false,
      summary: `A ${shipment.disruption.toLowerCase()} has been detected on the ${shipment.origin}–${shipment.destination} route, affecting a ₹${shipment.value.toLocaleString('en-IN')} ${shipment.goods} shipment. The disruption has caused a ${shipment.delayDays}-day delay, putting financial obligations at risk. Immediate intervention is recommended to minimise losses and restore delivery commitments.`
    };
  }
}

// ============================================================
// Prompt 2 — Financial Impact Calculation
// ============================================================

/**
 * Calculate financial impact of a disruption
 * @param {Object} shipment
 * @returns {Promise<{success: boolean, penaltyCost: number, holdingCost: number, totalLoss: number, summary: string}>}
 */
async function calculateFinancialImpact(shipment) {
  const prompt = `You are a financial analyst for a supply chain company. Calculate the financial impact of this shipment disruption.

Shipment:
- Goods: ${shipment.goods}
- Shipment Value: ₹${shipment.value.toLocaleString('en-IN')}
- Delay Days: ${shipment.delayDays}
- Penalty per Day: ₹${shipment.penaltyPerDay.toLocaleString('en-IN')}
- Holding Cost per Day: ₹${shipment.holdingCostPerDay.toLocaleString('en-IN')}
- Route: ${shipment.origin} to ${shipment.destination}

Calculate exactly:
- penaltyCost = delayDays × penaltyPerDay
- holdingCost = delayDays × holdingCostPerDay
- totalLoss = penaltyCost + holdingCost

Return ONLY valid JSON (no extra text):
{
  "penaltyCost": <number>,
  "holdingCost": <number>,
  "totalLoss": <number>,
  "summary": "<one sentence about the total financial exposure>"
}`;

  try {
    const raw = await callGemini(prompt);
    const data = JSON.parse(raw);
    return {
      success: true,
      penaltyCost: data.penaltyCost || (shipment.delayDays * shipment.penaltyPerDay),
      holdingCost: data.holdingCost || (shipment.delayDays * shipment.holdingCostPerDay),
      totalLoss: data.totalLoss || ((shipment.delayDays * shipment.penaltyPerDay) + (shipment.delayDays * shipment.holdingCostPerDay)),
      summary: data.summary || ''
    };
  } catch (err) {
    console.error('calculateFinancialImpact error:', err);
    const penaltyCost = shipment.delayDays * shipment.penaltyPerDay;
    const holdingCost = shipment.delayDays * shipment.holdingCostPerDay;
    const totalLoss = penaltyCost + holdingCost;
    return {
      success: false,
      penaltyCost,
      holdingCost,
      totalLoss,
      summary: `This disruption is projected to cause a total financial loss of ₹${totalLoss.toLocaleString('en-IN')} over ${shipment.delayDays} day(s).`
    };
  }
}

// ============================================================
// Prompt 3 — Recommendations
// ============================================================

/**
 * Get cost-saving recommendations for a disrupted shipment
 * @param {Object} shipment
 * @param {number} totalLoss
 * @returns {Promise<{success: boolean, recommendations: Array}>}
 */
async function getRecommendations(shipment, totalLoss) {
  const prompt = `You are a supply chain logistics expert. Provide exactly 2 actionable recommendations to resolve this shipment disruption and minimise losses.

Shipment:
- Route: ${shipment.origin} → ${shipment.destination}
- Goods: ${shipment.goods}
- Disruption: ${shipment.disruption}
- Total Financial Loss: ₹${totalLoss.toLocaleString('en-IN')}
- Delay: ${shipment.delayDays} day(s)

Return ONLY valid JSON array (no extra text):
[
  {
    "title": "<short action title, e.g. Reroute via NH19>",
    "description": "<2-3 sentence practical description of this recommendation>",
    "timeSaved": "<estimated time saved, e.g. 1-2 days>",
    "costSaving": <estimated rupee amount saved as integer>,
    "confidence": "<High | Medium | Low>"
  },
  {
    "title": "<second recommendation title>",
    "description": "<description>",
    "timeSaved": "<time saved>",
    "costSaving": <saving amount>,
    "confidence": "<High | Medium | Low>"
  }
]`;

  try {
    const raw = await callGemini(prompt);
    const recommendations = JSON.parse(raw);
    return { success: true, recommendations };
  } catch (err) {
    console.error('getRecommendations error:', err);
    const saving1 = Math.round(totalLoss * 0.7);
    const saving2 = Math.round(totalLoss * 0.45);
    return {
      success: false,
      recommendations: [
        {
          title: `Activate Emergency Rerouting`,
          description: `Immediately engage an alternative logistics partner for the ${shipment.origin}–${shipment.destination} corridor. Rerouting via alternate highway can recover ${shipment.delayDays - 1} of the ${shipment.delayDays} delay days. This is the fastest resolution option.`,
          timeSaved: `${Math.max(1, shipment.delayDays - 1)} day(s)`,
          costSaving: saving1,
          confidence: 'High'
        },
        {
          title: `Partial Air Freight for Priority Stock`,
          description: `Identify the highest-value portion of the ${shipment.goods} consignment and air-freight it immediately. This mitigates penalty clauses on the most critical order lines. Remaining stock follows the original route once resolved.`,
          timeSaved: `${shipment.delayDays} day(s)`,
          costSaving: saving2,
          confidence: 'Medium'
        }
      ]
    };
  }
}

// ============================================================
// Prompt 4 — Supplier Health Score
// ============================================================

/**
 * Get AI health score for a supplier
 * @param {Object} supplier - { name, location, onTimeRate, recentDisruptions }
 * @returns {Promise<{success: boolean, score: number, label: string, explanation: string}>}
 */
async function getSupplierHealthScore(supplier) {
  const prompt = `You are a supply chain risk analyst. Score this supplier's health based on their performance data.

Supplier: ${supplier.name}
Location: ${supplier.location}
On-Time Delivery Rate: ${supplier.onTimeRate}%
Recent Disruptions (last 6 months): ${supplier.recentDisruptions}

Based on this data, provide a health score and assessment.
Return ONLY valid JSON (no extra text):
{
  "score": <integer 0-100>,
  "label": "<exactly one of: Reliable | Watch | High Risk>",
  "explanation": "<1-2 sentence explanation of the score>"
}`;

  try {
    const raw = await callGemini(prompt);
    const data = JSON.parse(raw);
    return {
      success: true,
      score: Math.min(100, Math.max(0, parseInt(data.score) || 0)),
      label: data.label || 'Watch',
      explanation: data.explanation || ''
    };
  } catch (err) {
    console.error('getSupplierHealthScore error:', err);
    // Fallback: calculate score from data
    const score = Math.round(
      (supplier.onTimeRate * 0.7) +
      (Math.max(0, 30 - supplier.recentDisruptions * 10) * 0.3)
    );
    let label = 'Reliable';
    if (score < 60) label = 'High Risk';
    else if (score < 80) label = 'Watch';

    return {
      success: false,
      score,
      label,
      explanation: `Based on a ${supplier.onTimeRate}% on-time delivery rate and ${supplier.recentDisruptions} recent disruption(s), this supplier has been assigned a ${label.toLowerCase()} health status.`
    };
  }
}
