import { Category, GameItemData } from './types';

// Helper to generate unique IDs
const uuid = () => Math.random().toString(36).substr(2, 9);

const RAW_DATA = [
  // Nội dung
  { text: "Khẳng định quyền bình đẳng của người da đen", category: Category.CONTENT },
  { text: "Khẳng định người da đen có vị thế cao nhất trong xã hội", category: Category.CONTENT },
  { text: "Lời kêu gọi đấu tranh giành quyền bình đẳng cho người da đen", category: Category.CONTENT },
  { text: "Kêu gọi sử dụng bạo lực để giành quyền lợi cho người da đen", category: Category.CONTENT },
  
  // Nghệ thuật
  { text: "Lập luận chặt chẽ, thuyết phục.", category: Category.ART },
  { text: "Từ ngữ và câu văn giàu hình ảnh, hàm súc, có tính gợi mở", category: Category.ART },
  { text: "Ngôn ngữ thiên về thuật ngữ chính trị, ít hình ảnh, không có giá trị biểu cảm", category: Category.ART },
  { text: "Nghệ thuật trùng điệp tạo nên giọng điệu và âm hưởng vừa hùng hồn vừa tha thiết…", category: Category.ART },
  { text: "Nghệ thuật trùng điệp chỉ được sử dụng để nhấn mạnh thông tin", category: Category.ART },

  // Bài học
  { text: "Luận đề Rõ ràng, ngắn gọn, dễ hiểu", category: Category.LESSON },
  { text: "Luận điểm Rõ ràng, sắp xếp hợp lí, làm sáng rõ luận đề", category: Category.LESSON },
  { text: "Lí lẽ, bằng chứng", category: Category.LESSON },
  { text: "Lí lẽ và bằng chứng thuyết phục, được triển khai theo trình tự hợp lí, có liên quan và cùng làm sáng tỏ luận điểm", category: Category.LESSON },
  { text: "Lí lẽ góp phần thể hiện giọng điệu", category: Category.LESSON },
];

export const GAME_DATA: GameItemData[] = RAW_DATA.map(item => ({
  id: uuid(),
  text: item.text,
  category: item.category
}));

export const CATEGORY_COLORS = {
  [Category.CONTENT]: "bg-blue-100 border-blue-500 text-blue-900",
  [Category.ART]: "bg-purple-100 border-purple-500 text-purple-900",
  [Category.LESSON]: "bg-amber-100 border-amber-500 text-amber-900",
};

export const CATEGORY_BG = {
  [Category.CONTENT]: "bg-blue-50/50 border-blue-200",
  [Category.ART]: "bg-purple-50/50 border-purple-200",
  [Category.LESSON]: "bg-amber-50/50 border-amber-200",
};
