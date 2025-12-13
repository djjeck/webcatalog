# WinCatalog Database Schema

This document describes the reverse-engineered schema of the WinCatalog SQLite database (`.w3cat` files).

## Database Overview

- **Database Type**: SQLite 3.x
- **File Extension**: `.w3cat`
- **Character Encoding**: UTF-8
- **Total Tables**: 26

## Schema Generation

The schema was extracted using `server/src/scripts/inspect-schema.ts` which queries SQLite metadata tables to document:
- Table structures and column definitions
- Primary keys and indexes
- Foreign key relationships
- Sample data

## Core Tables

### w3_items (Main Items Table)

The central table containing all catalog items (files, folders, drives, etc.).

| Column     | Type         | Description                                        |
| ---------- | ------------ | -------------------------------------------------- |
| `id`       | INTEGER (PK) | Unique item identifier                             |
| `flags`    | INTEGER      | Item flags/attributes                              |
| `itype`    | INTEGER      | Item type (150 = catalog root, 172 = volume, etc.) |
| `rating`   | INTEGER      | User rating                                        |
| `name`     | TEXT         | Item name/label                                    |
| `comments` | TEXT         | User comments                                      |

**Sample Row**:
```json
{
  "id": 1,
  "flags": "",
  "itype": 150,
  "rating": "",
  "name": "Catalog",
  "comments": ""
}
```

**Row Count**: 246,321

### w3_fileInfo (File Information)

Stores file-specific metadata.

| Column        | Type             | Description              |
| ------------- | ---------------- | ------------------------ |
| `id_item`     | INTEGER (PK, FK) | References `w3_items.id` |
| `name`        | TEXT             | File name                |
| `date_change` | TEXT             | Last modified date       |
| `date_create` | TEXT             | Creation date            |
| `size`        | INTEGER          | File size in bytes       |
| `fileflags`   | INTEGER          | File system flags        |
| `md5`         | TEXT             | MD5 hash                 |
| `crc32`       | TEXT             | CRC32 checksum           |

**Row Count**: 246,321

### w3_decent (Tree Structure)

Defines the hierarchical tree structure (parent-child relationships).

| Column      | Type             | Description                     |
| ----------- | ---------------- | ------------------------------- |
| `id_item`   | INTEGER (PK, FK) | Child item ID                   |
| `id_parent` | INTEGER (FK)     | Parent item ID                  |
| `expanded`  | CHAR(1)          | UI expansion state ('0' or '1') |

**Indexes**:
- `w3_decent_tree_parent` on `id_parent`

**Foreign Keys**:
- Self-referential: `id_parent` → `w3_decent.id_item` (CASCADE on delete)

**Row Count**: 246,321

### w3_volumeInfo (Drive/Volume Information)

Information about scanned drives and volumes.

| Column           | Type             | Description                     |
| ---------------- | ---------------- | ------------------------------- |
| `id_item`        | INTEGER (PK, FK) | References `w3_items.id`        |
| `filesys`        | TEXT             | File system type (e.g., "NTFS") |
| `volume_label`   | TEXT             | Volume label/name               |
| `root_path`      | TEXT             | Root path (e.g., "G:\\")        |
| `vtype`          | INTEGER          | Volume type                     |
| `size_total`     | INTEGER          | Total size in bytes             |
| `size_free`      | INTEGER          | Free space in bytes             |
| `serial`         | INTEGER          | Volume serial number            |
| `disk_number`    | INTEGER          | Disk number                     |
| `scan_preset_id` | INTEGER          | Scan preset configuration ID    |
| `date_added`     | TEXT             | Date volume was added           |
| `date_updated`   | TEXT             | Last update date                |

**Sample Row**:
```json
{
  "id_item": 7,
  "filesys": "NTFS",
  "volume_label": "A",
  "root_path": "G:\\",
  "vtype": 172,
  "size_total": 1000202653696,
  "size_free": 148583067648,
  "serial": 2020290812,
  "disk_number": 1,
  "scan_preset_id": 3,
  "date_added": "2024-11-05 20:41:47",
  "date_updated": "2024-11-05 20:41:47"
}
```

**Row Count**: 31

## Metadata Tables

### w3_exifInfo (EXIF Data for Images)

Stores EXIF metadata for image files.

**Key Columns**: `camera_make`, `camera_model`, `width`, `height`, `orientation`, `flash_used`, `iso_equivalent`, `focal_length`, `exposure_time`, `aperture_number`, `date_taken`, `author`, `copyright`, `gps_lat`, `gps_long`, and many more.

**Row Count**: 0 (empty in sample)

### w3_id3Info (Audio File Metadata)

MP3/audio file ID3 tag information.

**Key Columns**: `artist`, `album`, `year`, `track`, `genre`, `lyrics`, `title`, `comments`, `duration`, `bitrate`, `channels`, `sample_rate`

**Row Count**: 0 (empty in sample)

### w3_imageInfo (Image Properties)

Basic image properties.

**Columns**: `id_item`, `dimensions`, `colors`

**Row Count**: 0 (empty in sample)

## Linking Tables

### w3_keyword_links

Links items to keywords/tags.

| Column       | Type    |
| ------------ | ------- |
| `id_keyword` | INTEGER |
| `id_item`    | INTEGER |

**Indexes**: On both `id_keyword` and `id_item`

### w3_location_links

Links items to locations.

| Column        | Type    |
| ------------- | ------- |
| `id_location` | INTEGER |
| `id_item`     | INTEGER |

### w3_user_links

Links items to users.

| Column    | Type    |
| --------- | ------- |
| `id_user` | INTEGER |
| `id_item` | INTEGER |

### w3_volume_links

Links items to volumes (appears unused in favor of direct references).

| Column      | Type    |
| ----------- | ------- |
| `id_volume` | INTEGER |
| `id_item`   | INTEGER |

## Supporting Tables

### w3_keywords

Keyword/tag definitions.

| Column       | Type         |
| ------------ | ------------ |
| `id_keyword` | INTEGER (PK) |
| `keyword`    | TEXT         |

### w3_locations

Location definitions.

| Column        | Type         |
| ------------- | ------------ |
| `id_location` | INTEGER (PK) |
| `location`    | TEXT         |

### w3_users

User definitions.

| Column     | Type         |
| ---------- | ------------ |
| `id_user`  | INTEGER (PK) |
| `username` | TEXT         |

### w3_volumes

Volume references.

| Column      | Type         |
| ----------- | ------------ |
| `id_volume` | INTEGER (PK) |

**Row Count**: 31

## Additional Information Tables

### w3_additionalInfo

Additional UI-related information (font colors, styles, ratings).

**Columns**: `id_item`, `rating`, `font_color`, `font_style`

### w3_customfieldInfo

Custom field data stored as TEXT/JSON.

**Columns**: `id_item`, `fields`

### w3_iconInfo

Custom icon data.

**Columns**: `id_item`, `icon_normal`, `icon_selected`

### w3_picture

Picture/thumbnail data.

**Columns**: `id_item`, `picture` (likely BLOB)

### w3_userInfo

Extended user information.

**Columns**: `id_item`, `id_user`

### w3_locationInfo

Extended location information.

**Columns**: `id_item`, `id_location`

## Search and Indexing

### w3_searchIndex

Full-text search index.

**Columns**: `id_item`, `search_text`

### w3_searchIndexQueue

Queue for items to be indexed.

**Columns**: `id_item`

## Other Tables

### w3_meta

Metadata about the catalog itself.

**Columns**: `key`, `value`

### w3_statistic

Statistical information.

**Columns**: `id_item`, `files_count`, `folders_count`, `size`

### w3_strict

Alternative tree structure (stricter hierarchy?).

**Columns**: `id_item`, `id_parent`, `expanded`

**Foreign Keys**: Self-referential like `w3_decent`

## Database Relationships

```
w3_items (central table)
    ├─ w3_fileInfo (1:1) - File details
    ├─ w3_volumeInfo (1:1) - Volume details
    ├─ w3_decent (1:many) - Tree structure
    ├─ w3_keyword_links (many:many via w3_keywords)
    ├─ w3_location_links (many:many via w3_locations)
    ├─ w3_user_links (many:many via w3_users)
    ├─ w3_exifInfo (1:1) - Image EXIF data
    ├─ w3_id3Info (1:1) - Audio metadata
    ├─ w3_imageInfo (1:1) - Image properties
    ├─ w3_additionalInfo (1:1) - UI preferences
    └─ w3_searchIndex (1:1) - Search data
```

## Item Types (itype values)

Based on sample data:
- `150` - Catalog root
- `172` - Volume/Drive

Additional types likely exist for:
- Folders
- Files
- Virtual folders
- etc.

## Search Strategy

For implementing search functionality, the key tables are:

1. **w3_items** - Main item data (name, comments)
2. **w3_fileInfo** - File names and paths
3. **w3_decent** - To reconstruct full paths from tree structure
4. **w3_volumeInfo** - Volume context (root paths)
5. **w3_searchIndex** - Pre-built search index (if available)

### Reconstructing Full Paths

To get the full path of a file:
1. Start with item from `w3_fileInfo`
2. Traverse up through `w3_decent` using `id_parent` relationships
3. Concatenate names from `w3_items` and `w3_fileInfo`
4. Prepend volume `root_path` from `w3_volumeInfo`

## Notes

- Most metadata tables (EXIF, ID3, image info) are empty in the sample database
- The database uses both `w3_decent` and `w3_strict` for tree structures - purpose unclear
- Date fields are stored as TEXT in ISO format
- File sizes are stored as INTEGER (bytes)
- The schema supports rich metadata but may not always be populated
