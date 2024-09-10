import json

def extract_fish():
    # Read the Curiosities.json file
    with open('./Curiosities.json', 'r') as file:
        curiosities = json.load(file)

    # Initialize lists for fish and non-fish items
    fish_items = []
    non_fish_items = []
    unique_groups = set()

    # Separate fish from non-fish items
    for item in curiosities:
        group = item.get('Group', '')
        unique_groups.add(group)
        if 'Fish' in group and group != "Fishing Bait":
            fish_items.append(item)
        else:
            non_fish_items.append(item)

    # Print unique groups
    print("Unique Groups found:")
    for group in sorted(unique_groups):
        print(f"- {group}")

    # Sort fish items alphabetically by name
    fish_items.sort(key=lambda x: x.get('Name', '').lower())

    # Add the fishId field to fish items
    for index, item in enumerate(fish_items, start=1):
        item['fishId'] = f'fish{index}'

    # Write fish items to a new file
    with open('./Fish.json', 'w') as file:
        json.dump(fish_items, file, indent=2)

    # Update the original Curiosities.json file without fish items
    with open('./Curiosities.json', 'w') as file:
        json.dump(non_fish_items, file, indent=2)

    print(f"Extracted {len(fish_items)} fish items to Fish.json")
    print(f"Updated Curiosities.json with {len(non_fish_items)} non-fish items")

if __name__ == "__main__":
    extract_fish()
