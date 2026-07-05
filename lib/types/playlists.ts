export type PlaylistItem = {
  id: string;
  playlistId: string;
  reviewId: string;
  tagId: string;
  position: number;
  createdAt: string;
  creatorNote: string | null;
};

export type Playlist = {
  id: string;
  organisationId: string;
  title: string;
  description: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  items: PlaylistItem[];
};
