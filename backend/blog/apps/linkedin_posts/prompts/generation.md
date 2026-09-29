# Generation Prompt

Bạn đang tạo một **DRAFT LinkedIn** theo VietQuant LinkedIn Posting
Guideline trong system prompt.

## Topic

{{topic}}

## Context

{{context}}

## Target audience

{{targetAudience}}

## Preferred connection

{{preferredConnection}}

## Visual hint

{{visualHint}}

## Source notes

{{sourceNotes}}

## Planned publish time

{{publishAt}}

## Requested media mode

{{requestedMediaMode}}

## 5 bài gần nhất

{{recentPosts}}

## Nhiệm vụ

1.  **Một insight + một connection**: Tập trung đúng một insight cốt lõi và một mối nối tự nhiên giữa STEM và quant.
2.  **Hook mạnh trong 1–2 dòng đầu**: Đi thẳng vào vấn đề, đánh trúng trải nghiệm quen thuộc của người đọc; tuyệt đối không mở bài bằng lời chào xã giao hay jargon tài chính xa lạ.
3.  **Độ dài phù hợp**: Mặc định 70–150 từ; riêng bài `one-liner`, `observation` hoặc punchy style cho phép ngắn 50–70 từ.
4.  **Giọng văn tự nhiên**: Viết như kỹ sư/researcher trò chuyện kỹ thuật với đồng nghiệp. Tuyệt đối KHÔNG viết như HR tuyển dụng, giáo trình hàn lâm, finance guru, hay generic AI copy.
5.  **Chính xác về analogy**: Analogy phải là sự so sánh tương đồng về tư duy/bản chất bài toán; KHÔNG đánh đồng kỹ thuật (ví dụ không biến TLE thành network latency vật lý). Nếu connection không tự nhiên, đừng gượng ép.
6.  **Factual integrity**: Không bịa đặt số liệu, performance, thành tích, hoặc market facts. Rà soát kỹ wording tuyệt đối như `luôn`, `y hệt`, `chắc chắn`, `sẽ`, `ngay lập tức`, `hoàn hảo` và causal claim quá mạnh. Với technical/market claim, ưu tiên wording chính xác như `có thể`, `trong một số trường hợp`, `không đảm bảo`, `có điểm tương đồng` khi phù hợp—nhưng vẫn giữ câu chữ punchy, không hedge máy móc. Nếu có factual claim cần kiểm chứng, bắt buộc đặt `requiresHumanFactCheck=true` và ghi rõ claim trong `factCheckNotes`. Nếu `sourceNotes` không rỗng, mỗi note phải xuất hiện nguyên nghĩa trong một `factCheckNotes` để reviewer xác minh. Nếu không có, đặt `requiresHumanFactCheck=false` và `factCheckNotes=[]`.
7.  **Đa dạng từ recent posts (5 bài gần nhất)**:
    -   Gán `openingType` đúng một trong: `question | memory | statement | contrast | problem | story | one-liner`.
    -   Trong cửa sổ 5 bài tính cả draft hiện tại, cùng `openingType` không được quá 2 lần.
    -   Phân tích `recentPosts` để tránh lặp: topic, style, opening structure, hookSource, connection, và CTA wording. Hai bài liên tiếp có thể cùng style nếu đó là lựa chọn tự nhiên cho topic và opening vẫn đủ đa dạng.
    -   Không random style một cách vô nghĩa; hãy chọn style phù hợp nhất với topic hiện tại để tạo nhịp điệu tự nhiên cho feed.
8.  **CTA linh hoạt**:
    -   Đoạn cuối BẮT BUỘC là một VietQuant CTA tự nhiên, nằm trên **một dòng riêng** và được ngăn với phần nội dung bằng một dòng trống. Có thể là follow, employer-brand invitation, invitation tìm hiểu thêm, CTA cực ngắn, hoặc discussion question có nhắc trực tiếp VietQuant.
    -   Không máy móc lặp lại cùng một câu chữ CTA. Luân phiên tự nhiên: follow VietQuant, employer-branding CTA, câu hỏi thảo luận chuyên môn, invitation tìm hiểu thêm, hoặc CTA cực ngắn.
    -   Nếu dùng câu về "team quant số 1 Việt Nam", BẮT BUỘC phải thể hiện đây là mục tiêu/khát vọng (`aspiration/goal`), tuyệt đối không trình bày như một fact đã được chứng minh hay tự xưng.
9.  **Hashtag**: `hashtags` phải chứa `#VietQuant`; có thể thêm tối đa 3 hashtag liên quan khác (tổng cộng 1–4 hashtag, mỗi hashtag bắt đầu bằng `#` và chỉ gồm chữ, số, gạch dưới).
    -   Chỉ đặt hashtag trong `hashtags`, không chèn vào `content` và không lặp hashtag.
10. **Giữ chính xác nghĩa technical verdict**: Ví dụ timeout là TLE, còn output sai là WA.
    -   Nếu input có `preferredConnection`, `connection` phải giữ đúng cặp concept đó. `hookSource` và nội dung phải diễn đạt cùng concept một cách tự nhiên; không bắt buộc lặp nguyên văn keyword từ planning.
    -   Viết công thức ở dạng plain text phù hợp LinkedIn, ví dụ `O(N log N)`; không dùng LaTeX/Markdown escape như `\text`, vì LinkedIn không render LaTeX.
11. **Tuân thủ nghiêm ngặt Requested media mode**:
    -   Nếu là `none`: BẮT BUỘC đặt `media.mode = "none"` và 0 image plan (`images: []`).
    -   Nếu là `single-image`: BẮT BUỘC đặt `media.mode = "single-image"` và đúng 1 image plan.
    -   Nếu là `multi-image`: BẮT BUỘC đặt `media.mode = "multi-image"` và 2–20 image plans theo giới hạn API.
    Không được tự ý đổi media mode khác nếu Requested media mode đã được chỉ định.
12. **Nguyên tắc hình ảnh thực tế (Visual Metaphor & Concrete Keywords)**:
    -   Không dùng stock image chỉ để bài "có ảnh". Nếu visual không bổ sung giá trị thực, text-only tốt hơn ảnh không liên quan.
    -   **Bắt buộc từ khóa là vật thể nhìn thấy được (Visual Metaphor)**: Tuyệt đối KHÔNG dùng từ khóa khái niệm toán học/tài chính trừu tượng hay hàn lâm (ví dụ: `order book`, `market depth`, `quantitative`, `trading`, `technology`, `bayesian`). Phải chuyển đổi ý tưởng thành vật thể, hành động hoặc bối cảnh thực tế:
        -   *Thay vì:* `["order book", "market depth", "trading"]` (kho ảnh không tìm ra).
        -   *Chuyển thành:* `["stock chart screen", "dual monitor desk", "server room"]`.
    -   **Quy định số lượng từ khóa gọn**: Mỗi image plan chỉ trả về đúng **2–3 search keywords** bằng tiếng Anh ngắn gọn (ví dụ: `["server rack", "datacenter", "blue led"]`), không đưa cả cụm câu dài. Từ khóa đầu tiên (`searchKeywords[0]`) là primary query cụ thể nhất; các từ khóa sau là fallback ngắn và rộng hơn.
    -   Image concept và search keywords phải mô tả visual thực tế có khả năng tìm được trên source hiện tại (nếu Pexels: ảnh chụp đời thực như không gian làm việc, màn hình terminal, server room, bảng viết công thức, đồng hồ bấm giờ; KHÔNG yêu cầu Pexels tìm custom diagram hay chart bí truyền).
    -   Mỗi image plan phải có: slotId, order, role, preferredSource (`internal` | `generated` | `pexels`), concept, searchKeywords, altTextDraft.
    -   Các ảnh trong multi-image phải bổ sung cho nhau theo thứ tự logic, không lặp cùng một ý.
13. Không tạo video, không tạo sponsored carousel, không tạo document/PDF post.

## Generation Self-Review (Bắt buộc tự kiểm tra trước khi trả JSON)

Trước khi trả structured output, hãy tự rà soát lại draft theo 8 câu hỏi:
1. *Hook có đủ mạnh trong 1–2 dòng đầu để giữ chân người đọc STEM không?*
2. *Bài viết có tập trung vào duy nhất một insight chính không?*
3. *Connection với quant có chính xác và đúng bản chất tương đồng không?*
4. *Có câu nào mang giọng HR, giáo trình, finance guru hoặc generic AI copy không?*
5. *Có factual claim nào chưa được kiểm chứng không (đã đưa vào factCheckNotes chưa)?*
6. *Bài viết có giữ giới hạn openingType tối đa 2/5 và tránh lặp máy móc style, hook, connection hoặc CTA không?*
7. *CTA có tự nhiên và thể hiện đúng tính chất aspiration (nếu nhắc 'số 1') không?*
8. *Media có thực sự bổ sung giá trị và tuân thủ đúng requestedMediaMode không?*

Nếu chưa đạt điểm nào, hãy tự điều chỉnh lại nội dung trước khi xuất output.

14. Trả JSON đúng schema.
15. Không thêm prose hoặc Markdown ngoài JSON.
