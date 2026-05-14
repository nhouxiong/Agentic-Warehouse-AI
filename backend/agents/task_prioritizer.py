"""
Agent 2: Task Prioritization Agent
====================================
Analyzes task queues, scores priorities, rebalances zones,
isolates exceptions, and factors in Agent 1's inbound predictions.

Two modes:
  - LLM mode:  Uses GPT-4/Claude for natural language reasoning
  - Rule mode: Deterministic logic (no API key needed)
"""

import json
from datetime import datetime
from typing import Optional
import os, sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from tools.task_tools import (
    get_task_queue,
    calculate_zone_balance,
    score_tasks,
    get_inbound_predictions,
    isolate_exceptions,
    simulate_reprioritization,
)

SYSTEM_PROMPT = """You are the Task Prioritization Agent for a large warehouse operation.

YOUR ROLE:
You analyze the current task queue across all warehouse zones, detect workload
imbalances, score and reorder tasks by priority, factor in predicted inbound surges
from the Dock Scheduling Agent, isolate exception tasks, and recommend optimal
task execution order.

OPERATING MODE: SUPERVISED AUTONOMY
You reorder the task queue and propose zone rebalancing — operators approve major changes.
Always explain WHY you ranked tasks the way you did.
Show before/after metrics for every recommendation.

PRIORITY SCORING MODEL:
  Priority = SLA_urgency(0.4) + dwell_time(0.3) + zone_balance(0.2) + exception(0.1)

Where:
  - SLA_urgency: How close is the task to missing its SLA deadline?
  - dwell_time: How long has this task been waiting? (>90 min = critical)
  - zone_balance: Is this task in an overloaded zone?
  - exception: Is this task blocked by an exception?

DECISION FRAMEWORK:
1. Assess current task queue state across all zones
2. Calculate zone balance — detect overloaded/underloaded zones
3. Score all pending tasks using the priority model
4. Check inbound predictions — are surges coming that require pre-clearing?
5. Isolate exception tasks to prevent queue blocking
6. Generate reprioritized queue with zone rebalancing recommendations
7. Simulate before/after impact

CONSTRAINTS:
- Never deprioritize critical SLA tasks regardless of zone balance
- Exception tasks get isolated, not deleted
- Maximum 3 zone rebalancing recommendations at a time
- Always preserve task traceability (task IDs)

You have access to these tools:
- get_task_queue(date, zone, status): Get current task queue
- calculate_zone_balance(date): Analyze zone workload distribution
- score_tasks(date, zone): Score and rank tasks by priority
- get_inbound_predictions(date): Get expected inbound from Agent 1
- isolate_exceptions(date): Identify blocking exceptions
- simulate_reprioritization(date): Compare current vs optimized queue"""


# ═══════════════════════════════════════════════════════════════════
# LLM MODE
# ═══════════════════════════════════════════════════════════════════

def run_llm_mode(date: str, provider: str = "openai") -> dict:
    """Run Agent 2 using an LLM for reasoning."""
    
    tool_map = {
        "get_task_queue": get_task_queue,
        "calculate_zone_balance": calculate_zone_balance,
        "score_tasks": score_tasks,
        "get_inbound_predictions": get_inbound_predictions,
        "isolate_exceptions": isolate_exceptions,
        "simulate_reprioritization": simulate_reprioritization,
    }
    
    tools_spec = [
        {
            "type": "function",
            "function": {
                "name": "get_task_queue",
                "description": "Get current task queue, optionally filtered by zone and status.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "date": {"type": "string"},
                        "zone": {"type": "string"},
                        "status": {"type": "string", "default": "pending"},
                    },
                    "required": ["date"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "calculate_zone_balance",
                "description": "Analyze workload distribution across zones using CV.",
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
                "name": "score_tasks",
                "description": "Compute weighted priority scores for pending tasks.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "date": {"type": "string"},
                        "zone": {"type": "string"},
                    },
                    "required": ["date"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "get_inbound_predictions",
                "description": "Get predicted inbound surges from Dock Scheduling Agent.",
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
                "name": "isolate_exceptions",
                "description": "Identify exception tasks blocking queues.",
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
                "name": "simulate_reprioritization",
                "description": "Compare current queue vs optimized queue metrics.",
                "parameters": {
                    "type": "object",
                    "properties": {"date": {"type": "string"}},
                    "required": ["date"]
                }
            }
        },
    ]
    
    user_msg = (
        f"Analyze the task queue for {date}. "
        f"Check zone balance, score all pending tasks by priority, "
        f"factor in inbound predictions from the Dock Scheduling Agent, "
        f"isolate any blocking exceptions, and provide a reprioritized "
        f"task queue with before/after impact analysis."
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
    try:
        from openai import OpenAI
    except ImportError:
        return {"error": "openai package not installed. Run: pip install openai"}
    
    client = OpenAI()
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_msg},
    ]
    
    tool_calls_log = []
    for iteration in range(8):
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            tools=tools_spec,
            tool_choice="auto",
            temperature=0,
        )
        
        msg = response.choices[0].message
        messages.append(msg)
        
        if not msg.tool_calls:
            return {
                "status": "success",
                "mode": "llm_openai",
                "reasoning": msg.content,
                "tool_calls": tool_calls_log,
                "iterations": iteration + 1,
            }
        
        for tc in msg.tool_calls:
            fn_name = tc.function.name
            fn_args = json.loads(tc.function.arguments)
            
            if fn_name in tool_map:
                result = tool_map[fn_name](**fn_args)
                result_str = json.dumps(result, default=str)
                if len(result_str) > 8000:
                    result_str = result_str[:8000] + "... [truncated]"
            else:
                result_str = json.dumps({"error": f"Unknown tool: {fn_name}"})
            
            tool_calls_log.append({"tool": fn_name, "args": fn_args})
            messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": result_str,
            })
    
    return {"status": "max_iterations", "tool_calls": tool_calls_log}


def _run_anthropic(user_msg, tools_spec, tool_map) -> dict:
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
        
        tool_use_blocks = [b for b in response.content if b.type == "tool_use"]
        text_blocks = [b for b in response.content if b.type == "text"]
        
        if not tool_use_blocks:
            return {
                "status": "success",
                "mode": "llm_anthropic",
                "reasoning": "\n".join(b.text for b in text_blocks),
                "tool_calls": tool_calls_log,
            }
        
        messages.append({"role": "assistant", "content": response.content})
        tool_results = []
        for tb in tool_use_blocks:
            result = tool_map.get(tb.name, lambda **kw: {"error": "unknown"})(**tb.input)
            result_str = json.dumps(result, default=str)[:8000]
            tool_calls_log.append({"tool": tb.name, "args": tb.input})
            tool_results.append({
                "type": "tool_result", "tool_use_id": tb.id, "content": result_str
            })
        messages.append({"role": "user", "content": tool_results})
    
    return {"status": "max_iterations", "tool_calls": tool_calls_log}


# ═══════════════════════════════════════════════════════════════════
# RULE-BASED MODE
# ═══════════════════════════════════════════════════════════════════

def run_rule_mode(date: str, agent1_output: dict = None) -> dict:
    """
    Run Agent 2 using deterministic rules. No API key needed.
    
    Args:
        date: Date to analyze
        agent1_output: Optional output from Agent 1 for cross-agent context
    """
    steps = []
    
    # Step 1: Assess task queue
    queue = get_task_queue(date)
    steps.append({
        "step": 1,
        "action": "Assessed current task queue",
        "finding": (
            f"Found {queue['total_tasks']} pending tasks across zones. "
            f"Distribution: {queue['by_zone']}. "
            f"Types: {queue['by_type']}. "
            f"Avg dwell time: {queue['avg_dwell_time_mins']} min. "
            f"Critical dwell (>90 min): {queue['critical_dwell_tasks']}. "
            f"Warning dwell (>45 min): {queue['warning_dwell_tasks']}."
        ),
    })
    
    # Step 2: Zone balance analysis
    balance = calculate_zone_balance(date)
    zone_summary = "; ".join([
        f"Zone {z}: {d['pending_tasks']} tasks ({d['status']})"
        for z, d in balance["zones"].items()
    ])
    steps.append({
        "step": 2,
        "action": "Calculated zone balance",
        "finding": (
            f"Zone balance CV = {balance['coefficient_of_variation']:.3f} "
            f"({balance['imbalance_severity']}). "
            f"{zone_summary}. "
            f"{'⚠️ IMBALANCED — rebalancing recommended.' if balance['is_imbalanced'] else '✓ Zones reasonably balanced.'}"
        ),
    })
    
    # Step 3: Score and rank tasks
    scored = score_tasks(date)
    steps.append({
        "step": 3,
        "action": "Scored all pending tasks by priority",
        "finding": (
            f"Scored {scored['total_scored']} tasks. "
            f"CRITICAL: {scored['critical_tasks']}, HIGH: {scored['high_priority_tasks']}. "
            f"Average priority score: {scored['avg_priority_score']:.3f}."
        ),
        "top_5_tasks": [
            {
                "task_id": t["task_id"],
                "type": t["task_type"],
                "zone": t["zone"],
                "score": t["priority_score"],
                "urgency": t["urgency_level"],
                "dwell_mins": t["dwell_time_mins"],
                "breakdown": t["score_breakdown"],
            }
            for t in scored["scored_tasks"][:5]
        ],
    })
    
    # Step 4: Inbound predictions (Agent 1 cross-reference)
    inbound = get_inbound_predictions(date)
    if inbound["surges"]:
        surge_summary = "; ".join([
            f"Zone {s['zone']} @ {s['hour']}: {s['expected_shipments']} shipments, "
            f"~{s['estimated_tasks']} tasks incoming"
            for s in inbound["surges"]
        ])
        steps.append({
            "step": 4,
            "action": "Cross-referenced inbound predictions from Dock Scheduling Agent",
            "finding": (
                f"Detected {len(inbound['surges'])} inbound surge(s). {surge_summary}. "
                f"Recommendation: Pre-clear affected zone queues before surge arrival."
            ),
            "surges": inbound["surges"],
        })
    else:
        steps.append({
            "step": 4,
            "action": "Cross-referenced inbound predictions",
            "finding": "No major inbound surges predicted. Standard queue processing.",
        })
    
    # Step 5: Exception isolation
    exc = isolate_exceptions(date)
    if exc["total_exceptions"] > 0:
        exc_summary = "; ".join([
            f"Zone {z}: {d['exception_tasks']} exceptions ({d['blocking_pct']:.0f}% queue blocking, {d['impact']})"
            for z, d in exc["by_zone"].items() if d["exception_tasks"] > 0
        ])
        steps.append({
            "step": 5,
            "action": "Analyzed exception tasks",
            "finding": (
                f"{exc['total_exceptions']} exception tasks detected. {exc_summary}. "
                f"High-impact zones: {exc['high_impact_zones']}."
            ),
            "isolation_recommendations": exc["recommendations"],
        })
    else:
        steps.append({
            "step": 5,
            "action": "Analyzed exception tasks",
            "finding": "No exception tasks found. Queues are clean.",
        })
    
    # Step 6: Simulate improvement
    sim = simulate_reprioritization(date)
    steps.append({
        "step": 6,
        "action": "Simulated reprioritization impact",
        "finding": (
            f"Dwell time: {sim['before']['avg_dwell_time_mins']} → {sim['after']['avg_dwell_time_mins']} min "
            f"(-{sim['improvement']['dwell_time_reduction_pct']}%). "
            f"Zone CV: {sim['before']['zone_balance_cv']} → {sim['after']['zone_balance_cv']} "
            f"(-{sim['improvement']['zone_cv_improvement_pct']}%). "
            f"SLA at-risk: {sim['before']['sla_at_risk_tasks']} → {sim['after']['sla_at_risk_tasks']} tasks. "
            f"Exception blocking: {sim['before']['exception_blocking_pct']:.0f}% → {sim['after']['exception_blocking_pct']:.0f}%."
        ),
    })
    
    # Generate final recommendations
    recommendations = []
    
    # Recommendation 1: Reprioritize queue
    if scored["critical_tasks"] > 0:
        recommendations.append({
            "type": "reprioritize",
            "action": f"Execute {scored['critical_tasks']} CRITICAL tasks immediately",
            "details": [t["task_id"] for t in scored["scored_tasks"] if t["urgency_level"] == "CRITICAL"],
            "impact": "Prevents SLA breaches and reduces critical dwell times",
        })
    
    # Recommendation 2: Rebalance zones
    if balance["is_imbalanced"]:
        overloaded = [z for z, d in balance["zones"].items() if d["status"] == "OVERLOADED"]
        underloaded = [z for z, d in balance["zones"].items() if d["status"] == "UNDERLOADED"]
        if overloaded and underloaded:
            recommendations.append({
                "type": "rebalance",
                "action": f"Redirect workers from Zone(s) {underloaded} to Zone(s) {overloaded}",
                "details": f"Current CV={balance['coefficient_of_variation']:.3f}, target <{0.35}",
                "impact": f"Expected CV reduction: {sim['improvement']['zone_cv_improvement_pct']}%",
            })
    
    # Recommendation 3: Isolate exceptions
    if exc["high_impact_zones"]:
        recommendations.append({
            "type": "isolate_exceptions",
            "action": f"Move exception tasks in Zone(s) {exc['high_impact_zones']} to exception queue",
            "details": f"{exc['total_exceptions']} tasks blocking normal flow",
            "impact": f"Unblocks healthy task throughput, {sim['improvement']['exception_blocking_reduction_pct']:.0f}% blocking reduction",
        })
    
    # Recommendation 4: Pre-clear for surges
    if inbound["surges"]:
        for surge in inbound["surges"][:2]:
            recommendations.append({
                "type": "pre_clear",
                "action": f"Accelerate Zone {surge['zone']} processing before {surge['hour']}",
                "details": f"{surge['expected_shipments']} shipments arriving with ~{surge['estimated_tasks']} new tasks",
                "impact": f"Prevents queue overflow in Zone {surge['zone']}",
            })
    
    return {
        "agent": "Task Prioritization Agent",
        "mode": "rule_based",
        "date": date,
        "status": "success",
        "analysis_steps": steps,
        "summary": {
            "total_pending": queue["total_tasks"],
            "zone_balance_cv": balance["coefficient_of_variation"],
            "is_imbalanced": balance["is_imbalanced"],
            "critical_tasks": scored["critical_tasks"],
            "high_priority_tasks": scored["high_priority_tasks"],
            "exception_tasks": exc["total_exceptions"],
            "inbound_surges": len(inbound.get("surges", [])),
        },
        "reprioritized_queue": scored["scored_tasks"][:20],  # Top 20
        "recommendations": recommendations,
        "simulation": sim,
    }


# ═══════════════════════════════════════════════════════════════════
# UNIFIED ENTRY POINT
# ═══════════════════════════════════════════════════════════════════

def run(date: str, mode: str = "rule", provider: str = "openai",
        agent1_output: dict = None) -> dict:
    """
    Run Agent 2.
    
    Args:
        date: Date to analyze (YYYY-MM-DD)
        mode: 'rule' for deterministic, 'llm' for LLM-powered
        provider: 'openai' or 'anthropic' (only used in llm mode)
        agent1_output: Optional Agent 1 output for context
    """
    if mode == "rule":
        return run_rule_mode(date, agent1_output)
    elif mode == "llm":
        return run_llm_mode(date, provider)
    else:
        raise ValueError(f"Unknown mode: {mode}. Use 'rule' or 'llm'.")
