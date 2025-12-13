/**
 * TypeScript types for WinCatalog database schema
 * Based on reverse-engineered schema from .w3cat SQLite files
 */

/**
 * Main items table - central table for all catalog entries
 */
export interface W3Item {
  id: number;
  flags: number | null;
  itype: number;
  rating: number | null;
  name: string;
  comments: string | null;
}

/**
 * File information table - metadata for files
 */
export interface W3FileInfo {
  id_item: number;
  name: string;
  date_change: string | null;
  date_create: string | null;
  size: number | null;
  fileflags: number | null;
  md5: string | null;
  crc32: string | null;
}

/**
 * Tree structure table - hierarchical parent-child relationships
 */
export interface W3Decent {
  id_item: number;
  id_parent: number | null;
  expanded: string; // '0' or '1'
}

/**
 * Volume information table - drive/volume metadata
 */
export interface W3VolumeInfo {
  id_item: number;
  filesys: string | null;
  volume_label: string | null;
  root_path: string | null;
  vtype: number | null;
  size_total: number | null;
  size_free: number | null;
  serial: number | null;
  disk_number: number | null;
  scan_preset_id: number | null;
  date_added: string | null;
  date_updated: string | null;
}

/**
 * EXIF metadata for image files
 */
export interface W3ExifInfo {
  id_item: number;
  camera_make: string | null;
  camera_model: string | null;
  width: number | null;
  height: number | null;
  orientation: number | null;
  flash_used: number | null;
  iso_equivalent: number | null;
  focal_length: number | null;
  exposure_time: string | null;
  aperture_number: number | null;
  date_taken: string | null;
  author: string | null;
  copyright: string | null;
  gps_lat: number | null;
  gps_long: number | null;
}

/**
 * ID3 metadata for audio files
 */
export interface W3Id3Info {
  id_item: number;
  artist: string | null;
  album: string | null;
  year: number | null;
  track: number | null;
  genre: string | null;
  lyrics: string | null;
  title: string | null;
  comments: string | null;
  duration: number | null;
  bitrate: number | null;
  channels: number | null;
  sample_rate: number | null;
}

/**
 * Image properties
 */
export interface W3ImageInfo {
  id_item: number;
  dimensions: string | null;
  colors: number | null;
}

/**
 * Additional UI information
 */
export interface W3AdditionalInfo {
  id_item: number;
  rating: number | null;
  font_color: number | null;
  font_style: number | null;
}

/**
 * Keyword definitions
 */
export interface W3Keyword {
  id_keyword: number;
  keyword: string;
}

/**
 * Location definitions
 */
export interface W3Location {
  id_location: number;
  location: string;
}

/**
 * User definitions
 */
export interface W3User {
  id_user: number;
  username: string;
}

/**
 * Volume references
 */
export interface W3Volume {
  id_volume: number;
}

/**
 * Keyword to item link
 */
export interface W3KeywordLink {
  id_keyword: number;
  id_item: number;
}

/**
 * Location to item link
 */
export interface W3LocationLink {
  id_location: number;
  id_item: number;
}

/**
 * User to item link
 */
export interface W3UserLink {
  id_user: number;
  id_item: number;
}

/**
 * Volume to item link
 */
export interface W3VolumeLink {
  id_volume: number;
  id_item: number;
}

/**
 * Search index
 */
export interface W3SearchIndex {
  id_item: number;
  search_text: string | null;
}

/**
 * Database metadata
 */
export interface W3Meta {
  key: string;
  value: string | null;
}

/**
 * Statistical information
 */
export interface W3Statistic {
  id_item: number;
  files_count: number | null;
  folders_count: number | null;
  size: number | null;
}

/**
 * Known item type values
 */
export enum ItemType {
  CATALOG_ROOT = 150,
  VOLUME = 172,
  // Additional types to be discovered
}
