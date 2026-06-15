from PIL import Image, ImageDraw

SIZE = 81
GRAY = (156, 163, 175)
PURPLE = (124, 58, 237)

def make_icon(draw_func, color, filename):
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw_func(draw, color)
    img.save(filename)

def draw_home(draw, c):
    """房子图标"""
    # 屋顶三角形
    draw.polygon([(40, 10), (10, 38), (70, 38)], fill=c)
    # 墙体
    draw.rectangle([18, 38, 62, 68], fill=c)
    # 门
    draw.rectangle([33, 48, 48, 68], fill=(0, 0, 0, 0))
    # 烟囱
    draw.rectangle([52, 16, 58, 32], fill=c)

def draw_test(draw, c):
    """剪贴板/清单图标"""
    # 板子主体
    draw.rounded_rectangle([16, 12, 64, 70], radius=4, fill=c)
    # 夹子
    draw.rounded_rectangle([30, 6, 50, 16], radius=3, fill=c)
    # 白色横线（清单项）
    for y in [28, 38, 48, 58]:
        draw.rectangle([24, y, 56, y + 3], fill=(255, 255, 255, 200))
    # 勾选
    draw.line([(24, 30), (28, 34), (34, 27)], fill=(255, 255, 255, 230), width=2)

def draw_trophy(draw, c):
    """奖杯图标"""
    # 杯身
    draw.rounded_rectangle([24, 12, 56, 48], radius=6, fill=c)
    # 左把手
    draw.arc([12, 18, 30, 40], start=90, end=270, fill=c, width=4)
    # 右把手
    draw.arc([50, 18, 68, 40], start=270, end=90, fill=c, width=4)
    # 底座
    draw.rectangle([32, 48, 48, 54], fill=c)
    draw.rectangle([24, 54, 56, 62], fill=c)
    # 底座线
    draw.rectangle([20, 62, 60, 66], fill=c)

def draw_person(draw, c):
    """人物头像图标"""
    # 头
    draw.ellipse([28, 10, 52, 34], fill=c)
    # 身体
    draw.ellipse([16, 36, 64, 74], fill=c)

# 生成所有图标
icons = [
    (draw_home,  GRAY,  'images/tab_home.png'),
    (draw_home,  PURPLE,'images/tab_home_active.png'),
    (draw_test,  GRAY,  'images/tab_test.png'),
    (draw_test,  PURPLE,'images/tab_test_active.png'),
    (draw_trophy,GRAY,  'images/tab_ach.png'),
    (draw_trophy,PURPLE,'images/tab_ach_active.png'),
    (draw_person,GRAY,  'images/tab_me.png'),
    (draw_person,PURPLE,'images/tab_me_active.png'),
]

for func, color, path in icons:
    make_icon(func, color, path)
    print(f'  OK {path}')

print('Done!')
