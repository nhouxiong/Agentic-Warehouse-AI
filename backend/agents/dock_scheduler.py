"""
Agent 1: Dock Scheduling Agent
===============================
Analyzes dock appointment schedules, predicts congestion,
and recommends rescheduling actions.

Two modes:
  - LLM mode:  Uses GPT-4/Claude for natural language reasoning
  - Rule mode: Deterministic logic (no API key needed)
"""

import json
from datetime import datetime
from typing import Optional
import os, sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from tools.dock_tools import (
    get_todays_schedule,
    get_carrier_reliability,
    analyze_congestion,
    simulate_reschedule,
    get_dock_performance_history,
    generate_reschedule_recommendations,
)

SYSTEM_PROMPT = """You are the Dock Scheduling Agent for a large warehouse operation.

YOUR ROLE:
You analyze dock appointment schedules, predict which carriers will arrive late
using historical reliability data, identify congestion windows where too many
trucks compete for limited dock doors, and recommend specific rescheduling actions.

OPERATING MODE: ADVISORY
You recommend — humans decide. Never present actions as already taken.
Always explain your reasoning. Show before/after metrics for every recommendation.

DECISION FRAMEWORK:
1. Load today's schedule and identify high-risk carriers (on-time rate < 65%)
2. Analyze congestion windows — where does demand exceed dock capacity?
3. For congested windows, find moveable appointments:
   - Standard priority (not hot/expedited)
   - Unreliable carriers (likely late anyway)
   - Small shipments (easier to flex)
4. Suggest moving them to low-occupancy time slots
5. Quantify the impact: wait time reduction, congestion reduction

CONSTRAINTS:
- Never recommend moving "hot" priority appointments
- Stay within operating hours (6 AM – 10 PM)
- Account for carrier preferences (dock type)
- Maximum 5 rescheduling recommendations per analysis
- Always show confidence level for predictions

You have access to these tools:
- get_todays_schedule(date): Load all dock appointments for a date
- get_carrier_reliability(carrier_id): Get a carrier's performance profile
- analyze_congestion(date): Detect congestion windows
- generate_reschedule_recommendations(date): Get AI-generated recommendations
- simulate_reschedule(date, changes): Test impact of proposed changes
- get_dock_performance_history(lookback_days): Historical trends

Respond with structured analysis followed by clear recommendations."""


# ═══════════════════════════════════════════════════════════════════
# LLM MODE (OpenAI / Anthropic)
# ═══════════════════════════════════════════════════════════════════

def run_llm_mode(date: str, provider: str = "openai") -> dict:
    """Run Agent 1 using an LLM for reasoning."""
    
    tools_spec = [
        {
            "type": "function",
            "function": {
                "name": "get_todays_schedule",
                "description": "Load all dock appointments for a given date with carrier info and predicted delays.",
                "parameters": {
                    "type": "object",
                    "properties": {"date": {"type": "string", "description": "Date YYYY-MM-DD"}},
                    "required": ["date"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "get_carrier_reliability",
                "description": "Return a carrier's full reliability profile based on historical data.",
                "parameters": {
                    "type": "object",
                    "properties": {"carrier_id": {"type": "string"}},
                    "required": ["carrier_id"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "analyze_congestion",
                "description": "Scan the day's schedule in time windows to detect congestion.",
                "parameters": {
                    "type": "object",
                    "properties": {"date": {"type": "string"}},
                    "required": ["date"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "generate_reschedule_recommendations",
                "description": "Automatically generate rescheduling recommendations.",
                "parameters": {
                    "type": "object",
                    "properties": {"date": {"type": "string"}},
                    "required": ["date"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "simulate_reschedule",
                "description": "Simulate impact of rescheduling changes.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "date": {"type": "string"},
                        "changes": {"type": "array", "items": {"type": "object"}}
                    },
                    "required": ["date", "changes"]
                }
            }
        },
    ]
    
    tool_map = {
        "get_todays_schedule": get_todays_schedule,
        "get_carrier_reliability": get_carrier_reliability,
        "analyze_congestion": analyze_congestion,
        "generate_reschedule_recommendations": generate_reschedule_recommendations,
        "simulate_reschedule": simulate_reschedule,
    }
    
    user_msg = (
        f"Analyze the dock schedule for {date}. "
        f"Identify congestion risks, evaluate carrier reliability for high-risk carriers, "
        f"and recommend specific rescheduling actions. "
        f"Show before/after impact for your recommendations."
    )
    
    if provider == "openai":
        return _run_openai(user_msg, tools_spec, tool_map)
    elif provider == "anthropic":
        return _run_anthropic(user_msg, tools_spec, tool_map)
    else:
        raise ValueError(f"Unknown provider: {provider}")


def _openai_to_anthropic_tools(openai_tools):
    """Convert OpenAI tool specs (source of truth) into Anthropic's format."""
    return [
        {
            "name": t["function"]["name"],
            "description": t["function"]["description"],
            "input_schema": t["function"]["parameters"],
        }
        for t in openai_tools
    ]


def _run_openai(user_msg, tools_spec, tool_map) -> dict:
    """Execute agent loop with OpenAI function calling."""
    try:
        from openai import OpenAI
    except ImportError:
        return {"error": "openai package not installed. Run: pip install openai"}
    
    client = OpenAI()
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_msg},
    ]
    
    # Agent loop: call LLM → execute tools → feed results back → repeat
    max_iterations = 8
    tool_calls_log = []
    
    for iteration in range(max_iterations):
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            tools=tools_spec,
            tool_choice="auto",
            temperature=0,
        )
        
        msg = response.choices[0].message
        messages.append(msg)
        
        # If no tool calls, we have the final answer
        if not msg.tool_calls:
            return {
                "status": "success",
                "mode": "llm_openai",
                "reasoning": msg.content,
                "tool_calls": tool_calls_log,
                "iterations": iteration + 1,
            }
        
        # Execute tool calls
        for tc in msg.tool_calls:
            fn_name = tc.function.name
            fn_args = json.loads(tc.function.arguments)
            
            if fn_name in tool_map:
                result = tool_map[fn_name](**fn_args)
                # Truncate large results for context window
                result_str = json.dumps(result, default=str)
                if len(result_str) > 8000:
                    result_str = result_str[:8000] + "... [truncated]"
            else:
                result_str = json.dumps({"error": f"Unknown tool: {fn_name}"})
            
            tool_calls_log.append({
                "tool": fn_name,
                "args": fn_args,
                "result_preview": result_str[:200],
            })
            
            messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": result_str,
            })
    
    return {
        "status": "max_iterations_reached",
        "mode": "llm_openai",
        "reasoning": messages[-1].get("content", ""),
        "tool_calls": tool_calls_log,
    }


def _run_anthropic(user_msg, tools_spec, tool_map) -> dict:
    """Execute agent loop with Anthropic tool use."""
    try:
        import anthropic
    except ImportError:
        return {"error": "anthropic package not installed. Run: pip install anthropic"}

    client = anthropic.Anthropic()
    tools = _openai_to_anthropic_tools(tools_spec)

    messages = [{"role": "user", "content": user_msg}]
    tool_calls_log = []
    
    for iteration in range(8):
        response = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            messages=messages,
            tools=tools,
        )
        
        # Check if we need to process tool use
        tool_use_blocks = [b for b in response.content if b.type == "tool_use"]
        text_blocks = [b for b in response.content if b.type == "text"]
        
        if not tool_use_blocks:
            return {
                "status": "success",
                "mode": "llm_anthropic",
                "reasoning": "\n".join(b.text for b in text_blocks),
                "tool_calls": tool_calls_log,
                "iterations": iteration + 1,
            }
        
        # Add assistant message with all content blocks
        messages.append({"role": "assistant", "content": response.content})
        
        # Execute tools and collect results
        tool_results = []
        for tb in tool_use_blocks:
            fn_name = tb.name
            fn_args = tb.input
            
            if fn_name in tool_map:
                result = tool_map[fn_name](**fn_args)
                result_str = json.dumps(result, default=str)[:8000]
            else:
                result_str = json.dumps({"error": f"Unknown tool: {fn_name}"})
            
            tool_calls_log.append({"tool": fn_name, "args": fn_args})
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": tb.id,
                "content": result_str,
            })
        
        messages.append({"role": "user", "content": tool_results})
    
    return {"status": "max_iterations", "mode": "llm_anthropic", "tool_calls": tool_calls_log}


# ═══════════════════════════════════════════════════════════════════
# RULE-BASED MODE (no LLM needed)
# ═══════════════════════════════════════════════════════════════════

def run_rule_mode(date: str) -> dict:
    """
    Run Agent 1 using deterministic rules.
    No API key needed — perfect for testing and demos.
    """
    steps = []
    
    # Step 1: Load schedule
    schedule = get_todays_schedule(date)
    # Treat as empty only if summary says zero appointments. The happy path
    # puts total_appointments inside `summary`; the empty path mirrors both.
    total = (schedule.get("summary") or {}).get("total_appointments", 0)
    if total == 0:
        return {
            "agent": "Dock Scheduling Agent",
            "mode": "rule_based",
            "date": date,
            "status": "no_data",
            "message": f"No appointments found for {date}",
            "analysis_steps": [],
            "summary": {
                "total_appointments": 0,
                "peak_congestion": 0,
                "congested_windows": 0,
                "recommendations_count": 0,
                "high_risk_carriers": 0,
            },
            "recommendations": [],
            "congestion_heatmap": [],
        }
    summary = schedule["summary"]
    steps.append({
        "step": 1,
        "action": "Loaded today's dock schedule",
        "finding": (
            f"Found {summary['total_appointments']} appointments across {len([z for z in summary['by_zone'] if summary['by_zone'][z] > 0])} zones. "
            f"Total inbound volume: {summary['total_pallets']} pallets. "
            f"Priority breakdown: {summary['by_priority']}. "
            f"High-risk carriers (on-time < 65%): {summary['high_risk_carriers']}."
        ),
    })
    
    # Step 2: Analyze congestion
    congestion = analyze_congestion(date)
    steps.append({
        "step": 2,
        "action": "Analyzed congestion windows",
        "finding": (
            f"Peak dock occupancy: {congestion['peak_occupancy_rate']:.0%} "
            f"({congestion['peak_concurrent_trucks']} concurrent trucks). "
            f"Detected {congestion['congested_windows']} congested window(s) "
            f"(>{int(100*0.8)}% capacity)."
        ),
    })
    
    # Step 3: Profile high-risk carriers
    high_risk = [
        a for a in schedule["appointments"] if a["on_time_rate"] < 0.65
    ]
    carrier_profiles = []
    for appt in high_risk[:3]:  # Top 3
        profile = get_carrier_reliability(appt["carrier_id"])
        carrier_profiles.append(profile)
    
    if carrier_profiles:
        risk_summary = "; ".join([
            f"{p['carrier_name']} ({p['on_time_rate']:.0%} on-time, avg {p['avg_delay_mins']}min delay)"
            for p in carrier_profiles
        ])
        steps.append({
            "step": 3,
            "action": "Profiled high-risk carriers",
            "finding": f"Key risk carriers: {risk_summary}",
        })
    
    # Step 4: Generate recommendations
    recs = generate_reschedule_recommendations(date)
    if recs["recommendations"]:
        rec_details = []
        for r in recs["recommendations"]:
            rec_details.append(
                f"Move {r['appointment_id']} ({r['carrier']}) "
                f"from {r['current_time'][-5:]} → {r['suggested_time'][-5:] if r['suggested_time'] else 'TBD'}. "
                f"Reason: {r['reasoning']}"
            )
        steps.append({
            "step": 4,
            "action": "Generated rescheduling recommendations",
            "finding": f"{len(recs['recommendations'])} recommendations. {recs['summary']}",
            "recommendations": rec_details,
        })
    else:
        steps.append({
            "step": 4,
            "action": "Generated rescheduling recommendations",
            "finding": "No congestion detected — schedule looks healthy.",
        })
    
    # Step 5: Simulate impact
    if recs["recommendations"]:
        changes = [
            {"appointment_id": r["appointment_id"], "new_time": r["suggested_time"]}
            for r in recs["recommendations"]
            if r["suggested_time"]
        ]
        if changes:
            sim = simulate_reschedule(date, changes)
            steps.append({
                "step": 5,
                "action": "Simulated rescheduling impact",
                "finding": (
                    f"Peak occupancy: {sim['before']['peak_occupancy']:.0%} → {sim['after']['peak_occupancy']:.0%} "
                    f"({sim['improvement']['peak_occupancy_delta']:.0%} reduction). "
                    f"Estimated wait time: {sim['before']['estimated_avg_wait_mins']:.0f} → "
                    f"{sim['after']['estimated_avg_wait_mins']:.0f} min "
                    f"({sim['improvement']['wait_time_reduction_mins']:.0f} min saved)."
                ),
            })
    
    # Step 6: Historical context
    history = get_dock_performance_history(30)
    steps.append({
        "step": 6,
        "action": "Reviewed 30-day historical performance",
        "finding": (
            f"30-day avg wait: {history['avg_carrier_wait_mins']} min. "
            f"Avg dock utilization: {history['avg_dock_utilization_pct']}%. "
            f"Worst day: {history['worst_wait_day']} ({history['worst_wait_mins']} min wait)."
        ),
    })
    
    # Compile final output
    return {
        "agent": "Dock Scheduling Agent",
        "mode": "rule_based",
        "date": date,
        "status": "success",
        "analysis_steps": steps,
        "summary": {
            "total_appointments": summary["total_appointments"],
            "peak_congestion": congestion["peak_occupancy_rate"],
            "congested_windows": congestion["congested_windows"],
            "recommendations_count": len(recs.get("recommendations", [])),
            "high_risk_carriers": summary["high_risk_carriers"],
        },
        "recommendations": recs.get("recommendations", []),
        "congestion_heatmap": congestion.get("heatmap", []),
    }


# ═══════════════════════════════════════════════════════════════════
# UNIFIED ENTRY POINT
# ═══════════════════════════════════════════════════════════════════

def run(date: str, mode: str = "rule", provider: str = "openai") -> dict:
    """
    Run Agent 1.
    
    Args:
        date: Date to analyze (YYYY-MM-DD)
        mode: 'rule' for deterministic, 'llm' for LLM-powered
        provider: 'openai' or 'anthropic' (only used in llm mode)
    """
    if mode == "rule":
        return run_rule_mode(date)
    elif mode == "llm":
        return run_llm_mode(date, provider)
    else:
        raise ValueError(f"Unknown mode: {mode}. Use 'rule' or 'llm'.")
