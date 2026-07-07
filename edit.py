from pypdf import PdfReader, PdfWriter


def extract_pages(input_path, output_path, start_page, end_page):
    """
    从 PDF 中提取连续页码范围并保存为新文件。

    参数：
        input_path:  输入 PDF 的路径
        output_path: 输出 PDF 的路径
        start_page:  起始页索引
        end_page:    结束页索引
    """
    
    # 期望区间 [p1,p2]
    # 函数执行区间 [p1-1,p2)

    start_page = start_page - 1

    reader = PdfReader(input_path)
    writer = PdfWriter()

    for page_num in range(start_page, end_page):
        writer.add_page(reader.pages[page_num])

    with open(output_path, "wb") as output_file:
        writer.write(output_file)

    print(f"已提取第{start_page}-{end_page}页，保存至: {output_path}")
    print(f"共提取 {end_page - start_page} 页")


def merge_pdfs(first_path, second_path, output_path):
    """
    将两个 PDF 按顺序拼接为一个文件，文件1在前，文件2在后。

    参数：
        first_path: 第一个 PDF 的路径，拼接后位于前面
        second_path: 第二个 PDF 的路径，拼接后位于后面
        output_path: 合并后输出 PDF 的路径
    """
    reader1 = PdfReader(first_path)
    reader2 = PdfReader(second_path)
    writer = PdfWriter()

    for page in reader1.pages:
        writer.add_page(page)

    for page in reader2.pages:
        writer.add_page(page)

    with open(output_path, "wb") as output_file:
        writer.write(output_file)

    total_pages = len(reader1.pages) + len(reader2.pages)
    print(f"已将 {first_path} 和 {second_path} 拼接至: {output_path}")
    print(f"共 {total_pages} 页")


def main():
    """
    # 示例一：提取PDF目标页面
    # 提取 文档.pdf 的第 23-40 页。
    input_path = "文档.pdf"
    output_path = "目标内容.pdf"
    start_page = 23 # 22
    end_page = 40 # 40

    extract_pages(input_path, output_path, start_page, end_page)
    """
    

    """
    # 示例二：合并两个PDF文件

    first_path = r"d:\folder\path\title-1.pdf"
    second_path = r"d:\folder\path\docx-1.pdf"
    output_path = r"d:\folder\path\output-1.pdf"

    merge_pdfs(first_path, second_path, output_path)
    """


if __name__ == "__main__":
    main()
