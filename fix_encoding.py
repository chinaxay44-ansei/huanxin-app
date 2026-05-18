# -*- coding: utf-8 -*-
import re

# 读取文件
with open('e:/备份/hx/1228/毕业设计论文.md', 'r', encoding='utf-8') as f:
    content = f.read()

# 替换问题字符
# 将乱码的箭头替换为正常的箭头符号
content = content.replace('？', '→')
content = content.replace('？', '→')  
content = content.replace('├？', '├─→')
content = content.replace('？', '→')

# 保存修复后的文件
with open('e:/备份/hx/1228/毕业设计论文_fixed.md', 'w', encoding='utf-8') as f:
    f.write(content)

print("文件修复完成！")
print(f"原文件大小：{len(content)} 字符")
