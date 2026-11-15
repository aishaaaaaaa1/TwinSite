import csv
import gzip
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_FILES = {
    "earth": "earth_features (1).csv",
    "moon": "moon_features.csv",
    "mars": "mars_features.csv",
}
COLUMNS = (
    "latitude",
    "longitude",
    "elevation",
    "slope",
    "roughness",
    "temperature_day",
    "temperature_night",
)


def prepare(body: str, source_name: str) -> int:
    source_path = ROOT / "data" / source_name
    output_path = ROOT / "public" / "data" / "measurements" / f"{body}.csv.gz"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with source_path.open(newline="", encoding="utf-8") as source:
        reader = csv.DictReader(source)
        if reader.fieldnames is None or any(column not in reader.fieldnames for column in COLUMNS):
            raise ValueError(f"{source_path} is missing one or more required columns: {', '.join(COLUMNS)}")

        with gzip.open(output_path, "wt", newline="", encoding="utf-8", compresslevel=9) as output:
            writer = csv.writer(output)
            writer.writerow(COLUMNS)
            row_count = 0
            for row in reader:
                writer.writerow(row[column] for column in COLUMNS)
                row_count += 1

    print(f"{body}: {row_count:,} rows -> {output_path.relative_to(ROOT)}")
    return row_count


def main() -> None:
    for body, source_name in SOURCE_FILES.items():
        prepare(body, source_name)


if __name__ == "__main__":
    main()
