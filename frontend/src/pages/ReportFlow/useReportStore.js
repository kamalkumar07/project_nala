/**
 * useReportStore.js — Zustand store carrying state across ReportFlow steps.
 *
 * State:
 *   • photo               File | null
 *   • compressedFile      File | null (max 1600px JPEG ~0.8)
 *   • photoPreview        string | null
 *   • lat                 number | null
 *   • lng                 number | null
 *   • locationLabel       string | null
 *   • outsideHpConfirmed  boolean
 *   • hazardType          'flood' | 'landslide' | 'waterlogging' | 'road_damage' | 'other' (default 'flood')
 *   • note                string (max 500 chars)
 *   • reportId            string | null
 */

import { create } from 'zustand';

export const useReportStore = create((set, get) => ({
  photo:              null,
  compressedFile:     null,
  photoPreview:       null,
  lat:                null,
  lng:                null,
  locationLabel:      null,
  outsideHpConfirmed: false,
  hazardType:         'flood',
  note:               '',
  reportId:           null,

  setPhoto(file, compressedFile, previewUrl) {
    const prev = get().photoPreview;
    if (prev && prev !== previewUrl) URL.revokeObjectURL(prev);

    set({
      photo: file,
      compressedFile: compressedFile ?? file,
      photoPreview: previewUrl ?? (file ? URL.createObjectURL(file) : null),
    });
  },

  setLocation(lat, lng, label) {
    set({
      lat,
      lng,
      locationLabel: label ?? null,
      // If coordinates changed, reset outside confirmation
      outsideHpConfirmed: false,
    });
  },

  setOutsideHpConfirmed(confirmed) {
    set({ outsideHpConfirmed: Boolean(confirmed) });
  },

  setHazardType(hazardType) {
    set({ hazardType: hazardType || 'flood' });
  },

  setNote(note) {
    set({ note: typeof note === 'string' ? note.slice(0, 500) : '' });
  },

  setReportId(id) {
    set({ reportId: id });
  },

  reset() {
    const prev = get().photoPreview;
    if (prev) URL.revokeObjectURL(prev);

    set({
      photo:              null,
      compressedFile:     null,
      photoPreview:       null,
      lat:                null,
      lng:                null,
      locationLabel:      null,
      outsideHpConfirmed: false,
      hazardType:         'flood',
      note:               '',
      reportId:           null,
    });
  },
}));
