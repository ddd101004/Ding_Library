
export interface Folder {
  folder_id: string;
  folder_name: string;
  description?: string;
  color?: string;
  cover_image?: string | null;
  cover_image_url?: string | null;
  sort_order?: number;
  item_count: number;
  fastgpt_dataset_id?: string | null;
  create_time?: string;
  update_time?: string;
}