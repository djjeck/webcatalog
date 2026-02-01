#!/bin/bash

set -e

# This script generates a file tree structure for integration testing.
# The tree is generated at tmp/tree/
# After this script runs, the WinCatalog database in this directory should be updated to reflect it.

OUTPUT_DIR="tmp/tree/"

TREE=$(cat <<EOF
root_1/
├── .hidden_dir/                # Hidden directory edge case
│   └── secret.txt
├── empty_folder/               # Empty directory edge case
├── prefix_tests/
│   ├── data                    # File name is a prefix of another
│   ├── data_extended.txt
│   └── data.bak                # Another prefix variant
├── case_sensitivity/
│   ├── Archive/
│   │   └── report.pdf
│   └── archive/                # Same name, different case
│       └── REPORT.PDF
├── special_chars/
│   ├── file with spaces.log    # Spaces in name
│   ├── study_guide.v1.2.md     # Multiple dots
│   └── ⚡_energy_⚡.txt          # Unicode/Emojis
├── deep/                       # Deep nesting test
│   └── level_1/
│       └── level_2/
│           └── level_3/
│               └── deep_file.txt
├── duplicate_names/            # Same filename, different paths
│   ├── sub_a/
│   │   └── unique.conf
│   └── sub_b/
│       └── unique.conf
├── .config                     # Hidden file at root
└── config                      # Regular file at root

root_2/
├── duplicate_names/            # Same filename, different volume
│   ├── @eaDir/                 # Directory to be excluded
│   │   ├── sub_a/
│   │   │   └── unique.conf
│   │   └── sub_b/
│   │       └── unique.conf
│   ├── sub_a/
│   │   └── unique.conf
│   ├── sub_b/
│   │   └── unique.conf
│   └── .DS_Store               # File to be excluded
└── config                      # Regular file at root
EOF
)

# Array to store the folder names at each depth
declare -a path_stack

filenames="$(
    while IFS= read -r line; do
        # Skip empty lines
        if [[ -z "${line// }" ]]; then continue; fi

        # Remove comments and trim
        line="$(echo "$line" | sed -r -e 's/[ ]*(#.*)?$//')"

        # Determine if it's a directory (ends with /)
        is_dir=false
        if [[ "$line" =~ \/$ ]]; then
          is_dir=true
          line="$(echo "$line" | sed -r -e 's#/$##')"
        fi

        # Calculate depth
        # Standard tree indentation uses 4 characters per level (e.g., "│   " or "├── ")
        prefix=$(echo "$line" | sed -r -e 's/^([ │├─└]*).*$/\1/')
        indent_length=${#prefix}
        depth=$(( indent_length / 4 ))

        # Clean the name by removing tree symbols
        clean_name=$(echo "$line" | sed -r -e 's/^[ │├─└]+//')

        # Update the path stack at the current depth
        path_stack[$depth]="$clean_name"

        # Reconstruct the full path from root to current depth
        full_path=""
        for (( i=0; i<=$depth; i++ )); do
            if [ $i -eq 0 ]; then
                full_path="${path_stack[$i]}"
            else
                full_path="${full_path}/${path_stack[$i]}"
            fi
        done

        # Output the path (appending / if it's a directory)
        if [ "$is_dir" = true ]; then
            echo "${full_path}/"
        else
            echo "${full_path}"
        fi
    done <<< "$TREE"
)"

echo "Generating the following structure:"
echo "$filenames" | sed -r -e "s#^#${OUTPUT_DIR}#"

rm -r "$OUTPUT_DIR"

while read -r filename; do
    if [[ "$filename" =~ \/$ ]]; then
        mkdir -p "${OUTPUT_DIR}${filename}"
    else
        content="${filename} $(echo "$filename" | shasum)"
        echo "$content" > "${OUTPUT_DIR}${filename}"
    fi
done <<< "$filenames"

echo ""
echo "Test tree created at $OUTPUT_DIR"
echo "Please update the WinCatalog database"
