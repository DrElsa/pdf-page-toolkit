# PDF 页面工具

一个极简的 PDF 处理工具，提供两种使用方式：

- **Python 脚本** (`edit.py`)：本地命令行使用。
- **纯前端网页** (`web_static/`)：浏览器中直接使用，可部署到 GitHub Pages 等静态托管服务。

---

## 功能

- **提取页面**：从 PDF 中按连续页码范围提取页面，保存为新文件。
- **合并 PDF**：将两个 PDF 按顺序合并为一个文件。

---

## 方式一：Python 脚本 `edit.py`

依赖：

```bash
pip install pypdf
```

打开 `edit.py`，修改 `main()` 中的文件路径和页码参数后运行：

```bash
python edit.py
```

提取页码从 1 开始计数，输入的两个数字构成闭合区间（例如 `start_page=2, end_page=4` 表示提取第 2 到第 4 页）。

---

## 方式二：纯前端网页 `web_static/`

直接用浏览器打开 `web_static/index.html` 即可使用，无需安装环境或启动服务器。

### 特点

- 所有 PDF 处理均在浏览器本地完成，文件不会上传服务器。
- 合并 PDF 时可选择两种模式：
  - **直接合并**：保留原始页面特性，不统一尺寸
  - **缩放合并**：将所有页面统一为 A4 尺寸，非 A4 页面会等比例缩放
- 提供独立的 Type3 字体检测功能，上传 PDF 后可手动检测并定位具体页码。

### 部署到 GitHub Pages

1. 将 `web_static` 目录中的内容推送到 GitHub 仓库。
2. 进入仓库 **Settings → Pages**。
3. Source 选择 **Deploy from a branch**，Branch 选择 `main`，Folder 选择 `/(root)`。
4. 保存后等待几分钟，即可通过生成的 GitHub Pages 链接访问。

---

## 隐私说明

- **Python 脚本**：完全本地运行，不连接网络。
- **纯前端网页**：PDF 文件不会离开你的设备，`pdf-lib.min.js` 已内置到项目中，不依赖外部 CDN。

---

## 技术栈

- `edit.py`：Python + [pypdf](https://pypi.org/project/pypdf/)
- `web_static`：HTML + JavaScript + [pdf-lib.js](https://pdf-lib.js.org/)
