import { Category, GameItemData } from "./types";

const uuid = () => Math.random().toString(36).substr(2, 9);

export const DEFAULT_RAW_DATA = [
  // NỘI DUNG
  {
    text: "Khẳng định quyền bình đẳng của người da đen",
    category: Category.CONTENT,
  },
  {
    text: "Khẳng định người da đen có vị thế cao nhất trong xã hội",
    category: Category.CONTENT,
  },
  {
    text: "Lời kêu gọi đấu tranh giành quyền bình đẳng cho người da đen",
    category: Category.CONTENT,
  },
  {
    text: "Kêu gọi sử dụng bạo lực để giành quyền lợi cho người da đen",
    category: Category.CONTENT,
  },

  // NGHỆ THUẬT
  { text: "Lập luận chặt chẽ, thuyết phục.", category: Category.ART },
  {
    text: "Từ ngữ và câu văn giàu hình ảnh, hàm súc, có tính gợi mở",
    category: Category.ART,
  },
  {
    text: "Ngôn ngữ thiên về thuật ngữ chính trị, ít hình ảnh, không có giá trị biểu cảm",
    category: Category.ART,
  },
  {
    text: "Nghệ thuật trùng điệp tạo nên giọng điệu và âm hưởng vừa hùng hồn vừa tha thiết…",
    category: Category.ART,
  },
  {
    text: "Nghệ thuật trùng điệp chỉ được sử dụng để nhấn mạnh thông tin",
    category: Category.ART,
  },

  // BÀI HỌC
  { text: "Luận đề rõ ràng, ngắn gọn, dễ hiểu", category: Category.LESSON },
  {
    text: "Luận điểm rõ ràng, sắp xếp hợp lí, làm sáng rõ luận đề",
    category: Category.LESSON,
  },
  { text: "Lí lẽ, bằng chứng", category: Category.LESSON },
  {
    text: "Lí lẽ và bằng chứng thuyết phục, được triển khai theo trình tự hợp lí, có liên quan và cùng làm sáng tỏ luận điểm",
    category: Category.LESSON,
  },
  { text: "Lí lẽ góp phần thể hiện giọng điệu.", category: Category.LESSON },
];

export const DEFAULT_GAME_DATA: GameItemData[] = DEFAULT_RAW_DATA.map(
  (item) => ({
    id: uuid(),
    text: item.text,
    category: item.category,
  }),
);

export const DEFAULT_SPAWN_INTERVAL = 6500;
