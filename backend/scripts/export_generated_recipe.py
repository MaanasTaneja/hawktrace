import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from database.ht_flows import db, get_generated_recipe_by_flow_id


def main() -> int:
    parser = argparse.ArgumentParser(description="Export a generated HawkTrace agent recipe from the database.")
    parser.add_argument("flow_id", help="Flow ID whose generated recipe should be exported.")
    parser.add_argument(
        "--out",
        default=None,
        help="Output JSON file. Defaults to artifacts/generated_recipes/<flow_id>.json.",
    )
    args = parser.parse_args()

    with db.get_session() as session:
        row = get_generated_recipe_by_flow_id(session, args.flow_id)

    if not row:
        print(f"No generated recipe found for flow_id={args.flow_id}", file=sys.stderr)
        return 1

    recipe = json.loads(row.agent_recipe)

    out_path = Path(args.out) if args.out else ROOT / "artifacts" / "generated_recipes" / f"{args.flow_id}.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(recipe, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")

    print(str(out_path))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
