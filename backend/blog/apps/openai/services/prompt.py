class PromptService:
    @classmethod
    def prompt_seo_keywords(cls, title: str, description: str) -> str:
        prompt = (
            "Generate exactly 10 SEO keywords as a JSON array of strings based on the title and content of my blog. "
            "The keywords should be relevant, high-ranking, and naturally fit the topic. Ensure they "
            "are optimized for search engines and suitable for my target audience. Here is the title "
            "and content of my blog:\n\n"
            f"Title: {title}\n"
            f"Content: {description}\n\n"
            "Return the result as a JSON array of strings only, with no additional text or explanation.\n"
        )
        return prompt

    @classmethod
    def prompt_seo_description(cls, title: str, description: str) -> str:
        prompt = (
            "Generate an SEO-optimized meta description based on the title and content of my blog. "
            "The description should be concise, compelling, and include relevant keywords to improve search engine ranking. "
            "It must not exceed 160 characters and should attract readers to click. Here is the title and content of my blog:\n\n"
            f"Title: {title}\n"
            f"Content: {description}\n\n"
            "Return only the SEO meta description as plain text, with no additional text or explanation.\n"
        )
        return prompt

    @classmethod
    def prompt_seo_keywords_and_description(cls, title: str, description: str) -> dict:
        keywords_prompt = (
            "Generate exactly 10 SEO keywords as a JSON array of strings based on the title and content of my blog. "
            "The keywords should be relevant, high-ranking, and naturally fit the topic. Ensure they "
            "are optimized for search engines and suitable for my target audience. Here is the title "
            "and content of my blog:\n\n"
            f"Title: {title}\n"
            f"Content: {description}\n\n"
            "Return the result as a JSON array of strings only, with no additional text or explanation.\n"
        )

        description_prompt = (
            "Generate an SEO-optimized meta description based on the title and content of my blog. "
            "The description should be concise, compelling, and include relevant keywords to improve search engine ranking. "
            "It must not exceed 160 characters and should attract readers to click. Here is the title and content of my blog:\n\n"
            f"Title: {title}\n"
            f"Content: {description}\n\n"
            "Return only the SEO meta description as plain text, with no additional text or explanation.\n"
        )

        return {"keywords": keywords_prompt, "description": description_prompt}

    @classmethod
    def prompt_blog_markdown(cls, title: str) -> str:
        prompt = (
            "You are a professional content generator and SEO expert. Create a comprehensive blog post (approximately 800 to 1200 words) by expanding on the provided title and content with detailed explanations, examples, and insights.\n\n"
            "Formatting Rules (Markdown only):\n"
            "1. The blog post should have the title only once as a `#` H1 heading. Do NOT repeat the blog post title as the first chapter heading.\n"
            "2. Before generating content, detect the language of the title. Use this detected language for the quote and for the entire blog post.\n"
            "3. **Strictly adhere to the language of the provided title for the entire blog post, including the quote.:**\n"
            "4. Insert a short, impactful quote related to the topic:\n"
            " - If the title is in Vietnamese, use Vietnamese for the quote.\n"
            " - Written in 1–2 sentences.\n"
            " - Contain approximately 40-60 words to maintain readability.\n"
            ' - Reference a credible source in the middle (e.g., "According to [source name](link)") with the source name hyperlinked.\n'
            " - Fully italicized using `_` or `*`.\n"
            " - Style and tone like a professional article pull-quote.\n"
            " - Use Markdown blockquote syntax (starting lines with '>')\n"
            "5. **For content with a list-like structure , use separate paragraphs. Start each paragraph with a bolded keyword followed by a colon and the detailed content. For example: **Keyword:** Detailed content...**.\n"
            "7. **Do not use Markdown bullet points (`-` or `*`) or numbered lists for any main content of the blog.**"
            "8. Use only Markdown syntax — no HTML tags.\n"
            "9. Use proper heading hierarchy (`#`, `##`, `###`).\n"
            "10. Use `**` for bold and `_` for italic.\n"
            "11. Use `[text](url)` for links.\n"
            "12. For images, use `![alt text](image-url)`.\n"
            "13. Only capitalize the first letter of each heading.\n"
            "14. Avoid repeating words between subheadings.\n\n"
            "Content Requirements:\n"
            "1. SEO Optimization: Naturally incorporate important keywords in the content.\n"
            "2. Content Only: The blog post should contain only the blog content — no code snippets unless they are part of the explanation.\n\n"
            "Blog Structure:\n"
            "- Engaging introduction that presents the topic.\n"
            "- Major sections of the blog post must be numbered using a level 2 heading (##) and manual numbering (e.g., ## 1. Introduction, ## 2. Steps to implement)\n"
            " But Subheadings (###) must not be numbered."
            "- Logically organized subheadings with detailed sections.\n"
            "- In-depth explanations and relevant examples.\n"
            "- Comprehensive conclusion summarizing key points.\n\n"
            f"Input:\n- Title: {title}\n\n"
            "Output Requirements:\n"
            "- Create a **Markdown** blog post following the above specifications, ready for publishing.\n"
            "- Write in a natural, engaging tone that connects with readers while maintaining professional quality.\n"
            "- Be approximately 800 to 1200 words long.\n"
            "- Ensure consistent spacing between sections for better readability.\n"
            "- Content must be translated into the same language as the title."
            "- Return **only the raw Markdown content** — no triple backticks, no ```markdown blocks at the end, no explanations, no comments, and no HTML."
        )
        return prompt

    @classmethod
    def prompt_get_list_title(
        cls, keyword: str, quantity: int = 1, language: str = ""
    ) -> str:
        if language.lower() == "vietnamese":
            return (
                "Bạn là chuyên gia SEO và sáng tạo nội dung blog.\n"
                f"Tạo {quantity} tiêu đề bài viết blog hấp dẫn, chuẩn SEO cho từ khóa chính: '{keyword}'.\n"
                "Yêu cầu:\n"
                "- Mỗi tiêu đề phải chứa từ khóa chính nhưng KHÔNG bắt buộc đặt ở đầu câu.\n"
                "- Sử dụng đa dạng cấu trúc câu, tránh lặp lại cùng một mẫu.\n"
                "- Chèn từ khóa phụ hoặc long-tail keyword liên quan để tăng khả năng hiển thị tìm kiếm.\n"
                "- Tiêu đề ngắn gọn (< 65 ký tự), dễ đọc, tự nhiên.\n"
                "- Có thể sử dụng số, câu hỏi, so sánh, review, năm để tăng CTR.\n"
                "- Không tạo tiêu đề quá giống nhau hoặc chỉ khác 1-2 chữ.\n"
                "- Tiêu đề BẮT BUỘC phải là tiếng Việt.\n"
                "- KHÔNG SỬ DỤNG TITLE CASE, chỉ viết chữ đầu.\n"
                f"- Có đúng {quantity} tiêu đề\n"
                "Trả về kết quả DUY NHẤT dưới dạng mảng JSON string hợp lệ, "
                'ví dụ: ["Tiêu đề 1", "Tiêu đề 2"] và KHÔNG kèm bất kỳ giải thích hoặc ký tự thừa nào.'
            )
        else:
            return (
                "You are an SEO and content writing expert.\n"
                f"Generate {quantity} engaging, SEO-optimized blog post titles for the main keyword: '{keyword}'.\n"
                "Requirements:\n"
                "- Each title must include the main keyword but NOT always at the start.\n"
                "- Use varied sentence structures, avoid repeating the same pattern.\n"
                "- Include secondary or long-tail keywords to boost search relevance.\n"
                "- Keep each title under 65 characters, clear, and natural.\n"
                "- Use numbers, questions, comparisons, reviews, or the year to increase CTR.\n"
                "- Do not create titles that are too similar or differ by only one word.\n"
                "- The title MUST be in English.\n"
                "- DO NOT USE TITLE CASE; only capitalize the first letter.\n"
                "Return ONLY the result as a valid JSON string array, "
                'e.g. ["Title 1", "Title 2"], with no explanations or extra text.'
            )

    @classmethod
    def prompt_get_popular_keywords(cls, input_object: dict):
        prompt = (
            "You are a keyword extraction expert. Given the following input object with keys and their corresponding content:\n"
            f"{input_object}\n"
            "Analyze the content of each element to determine the most popular and relevant keyword associated with it. "
            "The keyword must be a single word only and should be limited to topics within fintech, technology, IT, trading, and cryptocurrency. "
            "For example, from 'day trading', return 'trading'; from 'long-term investment', return 'investment'; "
            "and from 'Forex knowledge', return 'Forex'. The keyword must be suitable for searching and in English. "
            "Return the result as a JSON object structured like this:\n"
            "{\n"
            "  key-1: kw1,\n"
            "  key-2: kw2,\n"
            "  ...\n"
            "}\n"
            "Return the result as a JSON only, with no additional text or explanation."
        )
        return prompt

    @classmethod
    def prompt_get_tag(cls, title: str):
        return (
            "Bạn là một chuyên gia SEO. Nhiệm vụ của bạn là đọc title của bài blog và xuất ra duy nhất 1 tag khái quát nhất, thể hiện lĩnh vực chính mà title đề cập.\n"
            "Yêu cầu:\n"
            "- Tag phải ngắn gọn (1-2 từ).\n"
            "- Không dùng tên riêng (ví dụ: Hà Nội, Đà Lạt, Phú Quốc...).\n"
            "- Tag phải là lĩnh vực bao quát: ví dụ du lịch, ẩm thực, lập trình, sức khỏe, giáo dục, tài chính...  \n"
            "- Chỉ trả về tag, không giải thích thêm.  \n"
            "- Tag này phải dịch sang cùng ngôn ngữ với title.\n"
            f"Title: {title}"
        )
