#!/usr/bin/env python3
"""
Warehouse Agent System — Main Entry Point
==========================================

Usage:
    # Generate synthetic data
    python run.py generate

    # Run agent pipeline (rule-based, no API key needed)
    python run.py run --date 2024-10-15

    # Run with LLM (requires API key)
    python run.py run --date 2024-10-15 --mode llm --provider openai

    # Launch dashboard
    python run.py dashboard

    # Run pipeline and save JSON output
    python run.py run --date 2024-10-15 --output results.json
"""

import argparse
import sys
import os
import json


def cmd_generate(args):
    """Generate synthetic data."""
    from data.generate_synthetic_data import main
    main()


def cmd_run(args):
    """Run the agent pipeline."""
    from agents.orchestrator import run_pipeline
    
    result = run_pipeline(
        date=args.date,
        mode=args.mode,
        provider=args.provider,
    )
    
    # Print executive summary
    print("\n" + result.get("executive_summary", ""))
    
    # Save JSON if requested
    if args.output:
        os.makedirs("outputs", exist_ok=True)
        output_path = os.path.join("outputs", args.output)
        with open(output_path, "w") as f:
            json.dump(result, f, indent=2, default=str)
        print(f"\n✓ Full output saved to {output_path}")



def main():
    parser = argparse.ArgumentParser(
        description="Warehouse Agent System",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    sub = parser.add_subparsers(dest="command")
    
    # Generate
    sub.add_parser("generate", help="Generate synthetic warehouse data")
    
    # Run pipeline
    p_run = sub.add_parser("run", help="Run agent pipeline")
    p_run.add_argument("--date", default="2024-10-15", help="Date to analyze (YYYY-MM-DD)")
    p_run.add_argument("--mode", default="rule", choices=["rule", "llm"])
    p_run.add_argument("--provider", default="openai", choices=["openai", "anthropic"])
    p_run.add_argument("--output", help="Save JSON output (filename)")
    
    args = parser.parse_args()

    if args.command == "generate":
        cmd_generate(args)
    elif args.command == "run":
        cmd_run(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
