interface AuthorDisplayProps {
  authors: string[] | Array<{ name: string; name_zh?: string }>;
  publicationName?: string;
  abstract?: string;
  publicationDate?: string;
}

export default function AuthorDisplay({
  authors,
  publicationName,
  abstract,
  publicationDate,
}: AuthorDisplayProps) {
  // 获取前两个作者的名字
  const getDisplayAuthors = () => {
    if (!authors || authors.length === 0) return [];

    const firstTwo = authors.slice(0, 2);
    return firstTwo.map((author) => {
      // 处理不同的数据格式
      if (typeof author === "string") {
        return author;
      } else if (typeof author === "object" && author.name) {
        return author.name_zh || author.name;
      }
      return String(author);
    });
  };

  // 获取剩余作者数量
  const getRemainingCount = () => {
    if (!authors || authors.length <= 2) return 0;
    return authors.length - 2;
  };

  // 获取作者首字母
  const getAuthorInitial = (authorName: string) => {
    if (!authorName) return "";

    // 去除空格并获取第一个字符
    const firstChar = authorName.trim().charAt(0).toUpperCase();
    return firstChar;
  };

  const displayAuthors = getDisplayAuthors();
  const remainingCount = getRemainingCount();

  if (displayAuthors.length === 0) {
    return null;
  }

  return (
    <div>
      {/* 作者信息 */}
      <div className="flex items-center mb-[9px]">
        {displayAuthors.map((author, index) => (
          <div key={index} className="flex items-center relative">
            {/* 首字母头像 */}
            <div
              className="flex items-center justify-center rounded-full mr-[9px] flex-shrink-0 w-[22px] h-[22px] bg-[#CCCCCC] text-[16px] text-[#FFFFFF]"
            >
              {getAuthorInitial(author)}
            </div>
            {/* 作者名字 */}
            <span className="text-[16px] text-[#999999]">
              {author}
            </span>
            {/* 第一第二作者之间增加26px间距 */}
            {index === 0 && displayAuthors.length > 1 && (
              <div className="w-[26px]" />
            )}
          </div>
        ))}

        {/* 剩余作者数量显示 */}
        {remainingCount > 0 && (
          <div
            className="ml-[22px] flex items-center justify-center w-[28px] h-[20px] bg-[#CCCCCC] rounded-[10px] text-[16px] text-[#FFFFFF]"
          >
            +{remainingCount}
          </div>
        )}
      </div>

      {/* 出版信息 - 使用正常的文档流，不使用绝对定位 */}
      {publicationName && (
        <div className="flex items-center mb-[9px] whitespace-nowrap overflow-hidden text-ellipsis">
          <img
            src="/paper/paper-type@2x.png"
            alt="出版社"
            className="w-[21px] h-[20px] mr-[9px] flex-shrink-0"
          />
          <span className="text-[16px] text-[#999999]">
            {publicationName}
          </span>
        </div>
      )}

      {/* 摘要信息 - 如果有摘要，显示在出版社下面 */}
      {abstract && (
        <div
          className="text-gray-700 text-[16px] overflow-hidden break-words leading-[1.5]"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          <span className="text-gray-500">摘要：</span>
          {abstract}
        </div>
      )}
    </div>
  );
}
