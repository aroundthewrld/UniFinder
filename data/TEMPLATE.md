# How to add real programs to `programs.json`

`data/programs.json` is a single JSON **array** of program objects. Add one
object per program. The whole file must stay valid JSON — run `npm run check-data`
after editing to catch mistakes.

## Copy this template for each new program

```json
{
  "id": "tudelft-msc-ai",
  "name": "MSc Computer Science — Artificial Intelligence Track",
  "university": "Delft University of Technology",
  "country": "Netherlands",
  "city": "Delft",
  "level": "master",
  "language": "English",
  "field": "Artificial Intelligence",
  "durationMonths": 24,
  "tuitionEurPerYear": 2530,
  "selectivityTier": "high",
  "distinctiveNote": "Strong reinforcement-learning and computer-vision groups; many thesis projects run inside partner companies in the Rotterdam–The Hague tech corridor; selective AI track within the broader CS master.",
  "url": "https://www.tudelft.nl/onderwijs/opleidingen/masters/cs"
}
```

## Field-by-field rules

| Field | Rule |
|---|---|
| `id` | Unique, lowercase, no spaces. A slug like `university-level-field` works well. **No two records may share an id.** |
| `name` | The official program name as a student would search it. |
| `university` | Full institution name. |
| `country` | Must match what users type/select. Use the common English name: `Netherlands`, `Germany`, `Sweden`, `Switzerland`, `Spain`, `France`, `Italy`, `Denmark`, etc. |
| `city` | City of the main campus. |
| `level` | Exactly `"bachelor"` or `"master"` — nothing else. |
| `language` | `"English"` for every record in the MVP (the filter requires English). |
| `field` | Short discipline label, e.g. `Computer Science`, `Data Science`, `Robotics`, `Cybersecurity`. |
| `durationMonths` | A number, e.g. `24`. Not a string. |
| `tuitionEurPerYear` | A number, OR `null` if it varies/unknown. `0` means genuinely free. Don't guess — use `null` when unsure. |
| `selectivityTier` | Exactly `"high"`, `"medium"`, or `"low"`. **Drives the reach/match/safety label**, so be honest and consistent. |
| `distinctiveNote` | **The most important field.** See below. |
| `url` | Link to the official program page. |

## ⭐ Writing a good `distinctiveNote`

This is the raw material the AI uses to explain *why* a program fits a student.
Generic notes → generic, useless recommendations. Specific notes → the "wow, I
wouldn't have found that" moments.

**Include concrete, real details:**
- Named research strengths or labs ("strong systems-security group")
- Unusual specializations or tracks
- Industry ties / internship structure
- Anything that distinguishes it from a generic CS degree

❌ Bad: `"A good computer science program with many courses."`
✅ Good: `"Joint program between the CS and statistics faculties; heavy emphasis on large-scale distributed data systems; mandatory paid industry semester at partner firms."`

## Setting `selectivityTier` honestly

This controls whether a program shows as **reach / match / safety** relative to
a student. Calibrate across your whole dataset:
- `high` — very competitive (top-ranked, low acceptance)
- `medium` — solid, moderately competitive
- `low` — broadly accessible / high acceptance

If everything is `high`, the labels become meaningless. Aim for a realistic spread.

## Workflow

1. Open `data/programs.json`.
2. Add your objects to the array, separated by commas. **No trailing comma** after the last one.
3. Save, then run:
   ```
   npm run check-data
   ```
4. Fix anything it flags. When it says **All checks passed**, you're good.
