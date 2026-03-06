const RAW_ENGINEERING_UI_FLAG = String(import.meta.env.VITE_ENGINEERING_UI ?? '')
  .trim()
  .toLowerCase();

export const isEngineeringUiEnabled =
  import.meta.env.DEV ||
  RAW_ENGINEERING_UI_FLAG === '1' ||
  RAW_ENGINEERING_UI_FLAG === 'true' ||
  RAW_ENGINEERING_UI_FLAG === 'yes' ||
  RAW_ENGINEERING_UI_FLAG === 'on';

