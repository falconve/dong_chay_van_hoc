import { Category, GameItemData } from "./types";

const uuid = () => Math.random().toString(36).substr(2, 9);

export const DEFAULT_RAW_DATA = [
  // NỘI DUNG
  {
    text: "Khẳng định quyền tự do, bình đẳng của người da đen.",
    category: Category.CONTENT,
    isCorrect: true,
  },
  {
    text: "Khẳng định vị thế, quyền lực của người da đen.",
    category: Category.CONTENT,
    isCorrect: false,
  },
  {
    text: "Lời kêu gọi đấu tranh giành quyền bình đẳng cho người da đen",
    category: Category.CONTENT,
    isCorrect: true,
  },
  {
    text: "Lời kêu gọi sử dụng bạo lực để giành quyền bình đẳng cho người da đen.",
    category: Category.CONTENT,
    isCorrect: false,
  },

  // NGHỆ THUẬT
  {
    text: "Lập luận chặt chẽ, giàu sức thuyết phục.",
    category: Category.ART,
    isCorrect: true,
  },
  {
    text: "Từ ngữ và câu văn giàu hình ảnh, hầm súc, có tính gợi mở.",
    category: Category.ART,
    isCorrect: true,
  },
  {
    text: "Ngôn ngữ thiên về thuật ngữ chính trị, khoa học.",
    category: Category.ART,
    isCorrect: false,
  },
  {
    text: "Nghệ thuật trùng điệp tạo nên giọng điệu và âm hưởng vừa hùng hồn vừa tha thiết…",
    category: Category.ART,
    isCorrect: true,
  },
  {
    text: "Nghệ thuật trùng điệp tạo giọng điệu hào hứng, vui tươi, phấn khởi.",
    category: Category.ART,
    isCorrect: false,
  },

  // BÀI HỌC
  {
    text: "Luận đề rõ ràng, ngắn gọn, dễ hiểu.",
    category: Category.LESSON,
    isCorrect: true,
  },
  {
    text: "Luận điểm sắp xếp hợp lí, làm sáng rõ luận đề.",
    category: Category.LESSON,
    isCorrect: true,
  },
  {
    text: "Lí lẽ và bằng chứng thuyết phục, được triển khai theo trình tự hợp lí, có liên quan và cùng làm sáng tỏ luận điểm.",
    category: Category.LESSON,
    isCorrect: true,
  },
  {
    text: "Lí lẽ góp phần thể hiện giọng điệu.",
    category: Category.LESSON,
    isCorrect: true,
  },
  {
    text: "Lí lẽ thiên về bộc lộ thái độ, tình cảm của tác giả.",
    category: Category.LESSON,
    isCorrect: false,
  },
  {
    text: "Sử dụng các yếu tố tự sự, miêu tả, biểu cảm, các biện pháp tu từ làm tăng hiệu quả biểu đạt của văn bản.",
    category: Category.LESSON,
    isCorrect: true,
  },
  {
    text: "Sử dụng yếu tố nghị luận chủ yếu, không sử dụng các yếu tố miêu tả, biểu cảm.",
    category: Category.LESSON,
    isCorrect: false,
  },
  {
    text: "Sử dụng chủ yếu yếu tố thuyết minh tăng tính thuyết phục cho văn bản.",
    category: Category.LESSON,
    isCorrect: false,
  },
];

export const DEFAULT_GAME_DATA: GameItemData[] = DEFAULT_RAW_DATA.map(
  (item) => ({
    id: uuid(),
    text: item.text,
    category: item.category,
    isCorrect: item.isCorrect,
  }),
);

export const DEFAULT_SPAWN_INTERVAL = 5500; // Tăng tốc độ xuất hiện một chút
