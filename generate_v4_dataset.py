import pandas as pd
import random
import hashlib

random.seed(2026)

OUTPUT_FILE = "dataset/sif_sanket_synthetic_safety_reports_v4.csv"

TARGET_PER_LABEL_PER_RULE = 500

# ============================================================
# SCENARIO PAIRS
#
# YES and NO describe the SAME underlying situation.
# The difference is the actual safety condition.
# ============================================================

SCENARIOS = {

    "Energy Isolation": [

        {
            "activity": "pipeline maintenance",
            "yes": [
                "the isolation status had not been confirmed when the crew began work",
                "work started before confirmation that all relevant energy sources were isolated",
                "the crew approached the line while the required isolation remained unverified",
                "the line was opened before zero-energy conditions had been confirmed"
            ],
            "no": [
                "the isolation status had been confirmed before the crew began work",
                "work started only after all relevant energy sources were isolated and verified",
                "the crew approached the line after the required isolation had been confirmed",
                "the line was opened only after zero-energy conditions had been verified"
            ]
        },

        {
            "activity": "pump maintenance",
            "yes": [
                "the pump was approached before its energy isolation had been verified",
                "maintenance began while the isolation points had not yet been confirmed",
                "the crew started work although the energy source remained unverified",
                "the equipment was opened before the isolation status was confirmed"
            ],
            "no": [
                "the pump was approached after its energy isolation had been verified",
                "maintenance began after the isolation points had been confirmed",
                "the crew started work after the energy source had been verified as isolated",
                "the equipment was opened only after the isolation status was confirmed"
            ]
        },

        {
            "activity": "valve maintenance",
            "yes": [
                "the valve was opened before the isolation arrangement had been confirmed",
                "maintenance proceeded while the isolation status was still uncertain",
                "the crew began work without confirming the relevant energy isolation",
                "the equipment was accessed before the isolation points were verified"
            ],
            "no": [
                "the valve was opened after the isolation arrangement had been confirmed",
                "maintenance proceeded after the isolation status had been verified",
                "the crew began work after confirming the relevant energy isolation",
                "the equipment was accessed only after the isolation points were verified"
            ]
        }
    ],

    "Confined Space": [

        {
            "activity": "vessel inspection",
            "yes": [
                "a technician entered the vessel before atmospheric testing was completed",
                "entry began while the required gas test was still pending",
                "the technician entered before the required entry authorization was confirmed",
                "the crew entered the vessel before the required atmospheric checks were completed"
            ],
            "no": [
                "a technician entered the vessel after atmospheric testing was completed",
                "entry began only after the required gas test was completed",
                "the technician entered after the required entry authorization was confirmed",
                "the crew entered the vessel after the required atmospheric checks were completed"
            ]
        },

        {
            "activity": "tank cleaning",
            "yes": [
                "personnel entered the tank before the atmosphere had been checked",
                "cleaning began while the required entry controls were still being verified",
                "the crew entered before confirmation of the required standby arrangement",
                "tank entry proceeded while the communication arrangement remained unavailable"
            ],
            "no": [
                "personnel entered the tank after the atmosphere had been checked",
                "cleaning began after the required entry controls had been verified",
                "the crew entered after confirmation of the required standby arrangement",
                "tank entry proceeded after the communication arrangement had been confirmed"
            ]
        },

        {
            "activity": "confined-space maintenance",
            "yes": [
                "the maintenance crew entered before authorization for entry was confirmed",
                "work continued after communication with the standby person became unavailable",
                "the crew entered while atmospheric conditions remained unchecked",
                "personnel started the task before the required confined-space controls were verified"
            ],
            "no": [
                "the maintenance crew entered after authorization for entry was confirmed",
                "work continued while communication with the standby person remained available",
                "the crew entered after atmospheric conditions had been checked",
                "personnel started the task after the required confined-space controls were verified"
            ]
        }
    ],

    "Line of Fire": [

        {
            "activity": "crane operation",
            "yes": [
                "a worker remained beneath the suspended load while it was moving",
                "a worker entered the load travel area during crane movement",
                "personnel remained inside the exclusion zone while the load was being moved",
                "the suspended load was moved while a worker remained in its potential path"
            ],
            "no": [
                "workers remained outside the suspended-load area while it was moving",
                "personnel stayed outside the load travel area during crane movement",
                "the exclusion zone was maintained while the load was being moved",
                "the suspended load was moved only after workers had cleared its potential path"
            ]
        },

        {
            "activity": "lifting operation",
            "yes": [
                "the lifting activity continued while the exclusion zone was incomplete",
                "a worker entered the area beneath the suspended load",
                "personnel remained close to the load movement path during lifting",
                "the load was moved while the affected area had not been fully cleared"
            ],
            "no": [
                "the lifting activity continued with the exclusion zone maintained",
                "workers remained outside the area beneath the suspended load",
                "personnel remained clear of the load movement path during lifting",
                "the load was moved after the affected area had been fully cleared"
            ]
        },

        {
            "activity": "vehicle movement",
            "yes": [
                "a pedestrian remained in the vehicle movement path while the vehicle was reversing",
                "the vehicle moved while a pedestrian was inside the affected area",
                "a worker entered the reversing path before the vehicle movement was completed",
                "vehicle movement continued without effective separation from a pedestrian"
            ],
            "no": [
                "pedestrians remained outside the vehicle movement path while the vehicle was reversing",
                "the vehicle moved after pedestrians had cleared the affected area",
                "the worker entered the area only after vehicle movement was completed",
                "vehicle movement continued with effective separation from pedestrians"
            ]
        }
    ],

    "Hot Work": [

        {
            "activity": "welding",
            "yes": [
                "welding began before the required gas test had been completed",
                "the welding activity continued while the required hot-work controls were incomplete",
                "welding started before the work area had been verified for the task",
                "the crew began welding while the required authorization remained unconfirmed"
            ],
            "no": [
                "welding began after the required gas test had been completed",
                "the welding activity continued after the required hot-work controls were verified",
                "welding started after the work area had been verified for the task",
                "the crew began welding after the required authorization was confirmed"
            ]
        },

        {
            "activity": "grinding",
            "yes": [
                "grinding started while personnel remained exposed to the work area without the required protection",
                "the grinding activity continued before the required controls were confirmed",
                "the crew began grinding while the work area remained inadequately controlled",
                "grinding proceeded while personnel remained within the affected hazard area"
            ],
            "no": [
                "grinding started after the required protection had been confirmed",
                "the grinding activity continued after the required controls were verified",
                "the crew began grinding after the work area had been adequately controlled",
                "grinding proceeded after personnel had moved outside the affected hazard area"
            ]
        },

        {
            "activity": "cutting",
            "yes": [
                "cutting began before the required hot-work precautions were confirmed",
                "the cutting activity proceeded while the required atmosphere check was incomplete",
                "the crew started cutting before authorization for the activity was confirmed",
                "cutting continued while personnel remained exposed to the affected area"
            ],
            "no": [
                "cutting began after the required hot-work precautions were confirmed",
                "the cutting activity proceeded after the required atmosphere check was completed",
                "the crew started cutting after authorization for the activity was confirmed",
                "cutting continued after personnel had moved outside the affected area"
            ]
        }
    ]
}


# ============================================================
# REPORT WRITING STYLES
# ============================================================

STYLES = [

    "During {activity}, it was observed that {condition}.",

    "The team was carrying out {activity} when {condition}.",

    "An observation during {activity} found that {condition}.",

    "While {activity} was underway, {condition}.",

    "The report relates to {activity}. At the time of the observation, {condition}.",

    "During the work period, {condition} while the crew was engaged in {activity}.",

    "A field observation was recorded during {activity}: {condition}.",

    "The crew was engaged in {activity}; {condition}.",

    "During a planned work activity involving {activity}, {condition}.",

    "Work involving {activity} was observed. At the time, {condition}."
]


SITES = [
    "Refinery Area A",
    "Gas Processing Unit",
    "Pipeline Station 3",
    "Compressor Station 2",
    "Tank Farm",
    "Maintenance Workshop",
    "Production Area B",
    "Utility Section",
    "Loading Terminal",
    "Process Unit"
]


TIMES = [
    "during the morning shift",
    "during the afternoon shift",
    "during a planned maintenance window",
    "before the evening shutdown",
    "at the start of the work period",
    "during routine field activity",
    "while preparing the work area",
    ""
]


# These phrases deliberately appear on BOTH sides.
# This prevents simple keyword shortcuts.

COMMON_FOLLOWUPS = [
    "The supervisor reviewed the situation.",
    "The observation was reported to the site team.",
    "The work area was subsequently reviewed.",
    "The condition was discussed with the crew.",
    "The activity was brought to the attention of the supervisor.",
    ""
]


# ============================================================
# TEXT NORMALIZATION
# ============================================================

def normalize(text):
    return " ".join(
        text.lower()
        .replace(",", " ")
        .replace(".", " ")
        .replace(";", " ")
        .replace(":", " ")
        .split()
    )


# ============================================================
# GENERATE ONE REPORT
# ============================================================

def generate_report(rule, scenario, label):

    activity = scenario["activity"]

    if label == "YES":
        condition = random.choice(scenario["yes"])
    else:
        condition = random.choice(scenario["no"])

    style = random.choice(STYLES)

    text = style.format(
        activity=activity,
        condition=condition
    )

    site = random.choice(SITES)
    time = random.choice(TIMES)

    if time:
        text = f"{time}, at {site}, {text}"
    else:
        text = f"At {site}, {text}"

    # Same pool for both classes.
    followup = random.choice(COMMON_FOLLOWUPS)

    if followup:
        text += " " + followup

    return text


# ============================================================
# GENERATE DATASET
# ============================================================

reports = []

used_exact = set()
used_normalized = set()

report_id = 1

for rule, scenario_list in SCENARIOS.items():

    # We have 3 scenario families per rule.
    # Spread 500 reports approximately equally.

    for label in ["YES", "NO"]:

        generated = 0

        while generated < TARGET_PER_LABEL_PER_RULE:

            scenario = random.choice(scenario_list)

            text = generate_report(
                rule,
                scenario,
                label
            )

            norm = normalize(text)

            # Reject duplicate text immediately.
            if text in used_exact:
                continue

            if norm in used_normalized:
                continue

            used_exact.add(text)
            used_normalized.add(norm)

            reports.append({
                "report_id": f"V4-{report_id:05d}",
                "report_type": random.choice([
                    "Unsafe Act",
                    "Unsafe Condition",
                    "Near Miss",
                    "Safety Observation"
                ]),
                "site": random.choice(SITES),
                "activity": scenario["activity"],
                "report_text": text,
                "language": "English",
                "sif_potential": label,
                "life_saving_rule": rule
            })

            report_id += 1
            generated += 1


# ============================================================
# DATAFRAME
# ============================================================

df = pd.DataFrame(reports)

df = df.sample(
    frac=1,
    random_state=2026
).reset_index(drop=True)


# ============================================================
# FINAL VALIDATION
# ============================================================

exact_duplicates = df["report_text"].duplicated().sum()

normalized_duplicates = (
    df["report_text"]
    .map(normalize)
    .duplicated()
    .sum()
)

cross_label = (
    df.assign(
        normalized=df["report_text"].map(normalize)
    )
    .groupby("normalized")["sif_potential"]
    .nunique()
)

cross_label_count = (cross_label > 1).sum()


# ============================================================
# OUTPUT
# ============================================================

print("\n==========================================")
print("       SIF-SANKET V4 FINAL DATASET")
print("==========================================")

print("\nTotal reports:", len(df))

print("\nLabel distribution:")
print(df["sif_potential"].value_counts())

print("\nLSR distribution:")
print(df["life_saving_rule"].value_counts())

print("\nExact duplicates:", exact_duplicates)

print("Normalized duplicates:", normalized_duplicates)

print(
    "Cross-label duplicate texts:",
    cross_label_count
)

print("\nReports per activity:")
print(
    df.groupby(
        ["life_saving_rule", "activity", "sif_potential"]
    ).size()
)

print("\nExample YES:")
print(
    df[df["sif_potential"] == "YES"]
    ["report_text"]
    .head(5)
    .to_string(index=False)
)

print("\nExample NO:")
print(
    df[df["sif_potential"] == "NO"]
    ["report_text"]
    .head(5)
    .to_string(index=False)
)


# ============================================================
# SAVE
# ============================================================

df.to_csv(
    OUTPUT_FILE,
    index=False
)

print("\n==========================================")
print("Saved successfully:")
print(OUTPUT_FILE)
print("==========================================")