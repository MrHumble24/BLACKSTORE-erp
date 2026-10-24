/** Super-admin danger zone (F12, hard_delete): preview + execute hard delete. */
export type {
  HardDeleteTargetType,
  HardDeletePreviewRequest,
  HardDeleteRequest,
  HardDeleteReport,
  HardDeleteResult,
} from './model/types';
export { useHardDeletePreview, useHardDelete } from './api';
