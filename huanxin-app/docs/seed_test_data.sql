-- =============================================
-- 焕星 (HuanXing) 测试数据初始化脚本
-- 版本: v1.0
-- 创建日期: 2025-10-28
-- 说明: 用于开发和测试环境的示例数据
-- 警告: 不要在生产环境执行此脚本！
-- =============================================

-- =============================================
-- 1. 清理现有测试数据（可选）
-- =============================================

-- DELETE FROM work_views;
-- DELETE FROM comment_likes;
-- DELETE FROM comments;
-- DELETE FROM shares;
-- DELETE FROM likes;
-- DELETE FROM work_categories;
-- DELETE FROM works;
-- DELETE FROM ai_generations;
-- DELETE FROM ai_avatars;
-- DELETE FROM follows;
-- DELETE FROM messages;
-- DELETE FROM conversations;
-- DELETE FROM notifications;
-- DELETE FROM search_history;
-- DELETE FROM energy_transactions;
-- DELETE FROM user_interests;
-- DELETE FROM user_profiles;
-- DELETE FROM users WHERE phone LIKE 'test%';

-- =============================================
-- 2. 创建测试用户
-- =============================================

INSERT INTO users (id, phone, nickname, avatar_url, bio, gender, birthday, location, energy_balance, is_verified, verified_type) VALUES
  -- 官方账号
  ('00000000-0000-0000-0000-000000000001', 'official', '焕星官方', '/placeholder-logo.png', '焕星官方账号', 'other', NULL, '北京', 999999, true, 'official'),
  
  -- 测试用户1 - 活跃创作者
  ('11111111-1111-1111-1111-111111111111', 'test_user_1', '性活还得继续', '/placeholder-user.jpg', '热爱AI创作的设计师', 'male', '1995-06-15', '四川成都', 60, false, NULL),
  
  -- 测试用户2 - 普通用户
  ('22222222-2222-2222-2222-222222222222', 'test_user_2', '星海', '/placeholder-user.jpg', '摄影爱好者', 'female', '1998-03-20', '上海', 80, false, NULL),
  
  -- 测试用户3 - 认证创作者
  ('33333333-3333-3333-3333-333333333333', 'test_user_3', '冬季诈爱', '/placeholder-user.jpg', '一茉幽香 丝雨缠绵', 'female', '2000-11-08', '宁夏中卫', 120, true, 'creator'),
  
  -- 测试用户4
  ('44444444-4444-4444-4444-444444444444', 'test_user_4', 'melody', '/placeholder-user.jpg', '每天更新高质量原创模板...', 'female', '1997-05-12', '广东广州', 100, false, NULL),
  
  -- 测试用户5
  ('55555555-5555-5555-5555-555555555555', 'test_user_5', '井岛日北', '/placeholder-user.jpg', '爱豆系列经整理过后删除...', 'male', '1999-08-25', '浙江杭州', 90, false, NULL)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 3. 创建用户扩展资料
-- =============================================

INSERT INTO user_profiles (user_id, tags, zodiac_sign, age_group) VALUES
  ('11111111-1111-1111-1111-111111111111', ARRAY['摄影', 'AI', '旅行'], '双子座', '90后'),
  ('22222222-2222-2222-2222-222222222222', ARRAY['摄影', '美食', '电影'], '双鱼座', '90后'),
  ('33333333-3333-3333-3333-333333333333', ARRAY['音乐', '阅读', '烘焙'], '天蝎座', '00后'),
  ('44444444-4444-4444-4444-444444444444', ARRAY['设计', 'AI', '绘画'], '金牛座', '90后'),
  ('55555555-5555-5555-5555-555555555555', ARRAY['运动', '游戏', '动漫'], '处女座', '90后')
ON CONFLICT (user_id) DO NOTHING;

-- =============================================
-- 4. 创建关注关系
-- =============================================

INSERT INTO follows (follower_id, following_id) VALUES
  -- 用户1关注用户2、3、4
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'),
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333'),
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444'),
  
  -- 用户2关注用户1、3
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333'),
  
  -- 用户3被72人关注（模拟数据）
  ('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333'),
  ('55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333')
ON CONFLICT DO NOTHING;

-- 更新用户3的粉丝数为72
UPDATE users SET followers_count = 72 WHERE id = '33333333-3333-3333-3333-333333333333';

-- =============================================
-- 5. 创建AI模板
-- =============================================

INSERT INTO ai_templates (
  id,
  name, 
  description, 
  thumbnail_url, 
  category, 
  sub_category, 
  template_type,
  tags,
  is_new,
  is_hot,
  energy_cost,
  uses_count,
  config,
  sort_order
) VALUES
  -- 蓝调天使模板
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '蓝调天使',
    '方圣古限定 - 梦幻蓝色主题天使写真',
    '/blue-angel-ethereal.jpg',
    'image',
    'ai-face-swap',
    'portrait',
    ARRAY['梦幻', '天使', '蓝色', '方圣古限定'],
    true,
    true,
    20,
    5740,
    '{"model_version": "2.0", "style": "fantasy", "quality": "high"}',
    1000
  ),
  
  -- 蓝调骑士模板
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '蓝调骑士',
    '方圣古限定 - 蓝色主题骑士风格',
    '/blue-knight-fantasy.jpg',
    'image',
    'ai-face-swap',
    'portrait',
    ARRAY['骑士', '蓝色', '奇幻'],
    true,
    true,
    20,
    3200,
    '{"model_version": "2.0", "style": "fantasy"}',
    900
  ),
  
  -- emoji小人模板
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'get我的emoji小人',
    '将你的照片转换为可爱的emoji风格角色',
    '/emoji-avatar-character.jpg',
    'image',
    'fun-features',
    'style-transfer',
    ARRAY['emoji', '可爱', '卡通'],
    false,
    true,
    15,
    8920,
    '{"model_version": "2.0", "style": "emoji"}',
    800
  ),
  
  -- 氛围感滤镜
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '氛围感滤镜',
    '打造电影感的唯美氛围',
    '/aesthetic-filter-portrait.jpg',
    'image',
    'fun-features',
    'filter',
    ARRAY['滤镜', '氛围', '电影感'],
    false,
    true,
    10,
    12050,
    '{"model_version": "1.5", "filter_type": "cinematic"}',
    700
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 6. 创建测试作品
-- =============================================

INSERT INTO works (
  id,
  user_id, 
  title, 
  description, 
  type, 
  media_url, 
  thumbnail_url,
  category,
  sub_category,
  tags,
  is_ai_generated,
  template_id,
  views_count,
  likes_count,
  comments_count,
  uses_count,
  status,
  visibility,
  published_at
) VALUES
  -- 用户2的作品（播放页展示的）
  (
    'work-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '@洪兴社25号靓坤',
    '#音浮条知识人关连意行为#...',
    'image',
    '/girl-with-goldfish-artistic-photo.jpg',
    '/girl-with-goldfish-artistic-photo.jpg',
    'fun-mode',
    'creative',
    ARRAY['创意', '金鱼', '氛围'],
    true,
    NULL,
    1234,
    33,
    18,
    574,
    'published',
    'public',
    NOW() - INTERVAL '2 days'
  ),
  
  -- 用户1的作品1
  (
    'work-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    '蓝调天使',
    '方圣古限定',
    'image',
    '/blue-angel-ethereal.jpg',
    '/blue-angel-ethereal.jpg',
    'ai-photo',
    'portrait',
    ARRAY['新玩法', '蓝调天使'],
    true,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    2100,
    159,
    45,
    5740,
    'published',
    'public',
    NOW() - INTERVAL '1 day'
  ),
  
  -- 用户1的作品2
  (
    'work-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    '赛博朋克风格',
    '未来科技感写真',
    'image',
    '/cyberpunk-portrait-neon.jpg',
    '/cyberpunk-portrait-neon.jpg',
    'ai-photo',
    'portrait',
    ARRAY['赛博朋克', '科技', '霓虹'],
    true,
    NULL,
    641,
    3,
    12,
    320,
    'published',
    'public',
    NOW() - INTERVAL '3 days'
  ),
  
  -- 用户3的作品1
  (
    'work-4444-4444-4444-444444444444',
    '33333333-3333-3333-3333-333333333333',
    '秋日写真',
    '落叶纷飞的季节',
    'image',
    '/ai-portrait-autumn-leaves.jpg',
    '/ai-portrait-autumn-leaves.jpg',
    'ai-photo',
    'portrait',
    ARRAY['本人', '点赞拿', '原创'],
    true,
    NULL,
    892,
    56,
    23,
    120,
    'published',
    'public',
    NOW() - INTERVAL '5 days'
  ),
  
  -- 用户3的作品2
  (
    'work-5555-5555-5555-555555555555',
    '33333333-3333-3333-3333-333333333333',
    '春日花海',
    '樱花季的浪漫',
    'image',
    '/ai-portrait-spring-flowers.jpg',
    '/ai-portrait-spring-flowers.jpg',
    'ai-photo',
    'portrait',
    ARRAY['本人', '点赞拿', '发焕星', '可发平台'],
    true,
    NULL,
    456,
    28,
    15,
    80,
    'published',
    'public',
    NOW() - INTERVAL '7 days'
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 7. 创建点赞记录
-- =============================================

INSERT INTO likes (user_id, work_id) VALUES
  -- 用户1点赞了用户2的作品
  ('11111111-1111-1111-1111-111111111111', 'work-1111-1111-1111-111111111111'),
  
  -- 用户2点赞了用户1的作品
  ('22222222-2222-2222-2222-222222222222', 'work-2222-2222-2222-222222222222'),
  ('22222222-2222-2222-2222-222222222222', 'work-3333-3333-3333-333333333333'),
  
  -- 用户3点赞了用户1的作品
  ('33333333-3333-3333-3333-333333333333', 'work-2222-2222-2222-222222222222')
ON CONFLICT DO NOTHING;

-- =============================================
-- 8. 创建评论
-- =============================================

INSERT INTO comments (
  id,
  user_id, 
  work_id, 
  content, 
  location, 
  likes_count,
  created_at
) VALUES
  -- 作品1的评论
  (
    'comment-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'work-1111-1111-1111-111111111111',
    '又到了听罗生门的季节，可你早已不在身边',
    '内蒙古呼和浩特',
    2,
    NOW() - INTERVAL '1 day'
  ),
  (
    'comment-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    'work-1111-1111-1111-111111111111',
    '积极废人也想试图拥抱云彩与暖阳',
    '广西南宁',
    1,
    NOW() - INTERVAL '12 hours'
  ),
  
  -- 作品2的评论
  (
    'comment-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'work-2222-2222-2222-222222222222',
    '太美了！模板在哪里找？',
    '四川成都',
    5,
    NOW() - INTERVAL '20 hours'
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 9. 创建AI分身
-- =============================================

INSERT INTO ai_avatars (
  user_id,
  name,
  avatar_url,
  version,
  is_active,
  status,
  created_at
) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    '当前分身',
    '/ai-avatar-male.jpg',
    '2.0',
    true,
    'active',
    '2025-08-13'
  )
ON CONFLICT DO NOTHING;

-- =============================================
-- 10. 创建AI生成记录
-- =============================================

INSERT INTO ai_generations (
  id,
  user_id,
  template_id,
  input_type,
  input_data,
  source_urls,
  prompt,
  output_url,
  output_type,
  work_id,
  status,
  progress,
  energy_cost,
  started_at,
  completed_at
) VALUES
  (
    'gen-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'image',
    '{"source_urls": ["/placeholder-user.jpg"]}',
    ARRAY['/placeholder-user.jpg'],
    '蓝调天使主题',
    '/blue-angel-ethereal.jpg',
    'image',
    'work-2222-2222-2222-222222222222',
    'completed',
    100,
    20,
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days' + INTERVAL '1 minute'
  ),
  (
    'gen-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'image',
    '{"source_urls": ["/placeholder-user.jpg"]}',
    ARRAY['/placeholder-user.jpg'],
    'emoji风格',
    NULL,
    NULL,
    NULL,
    'processing',
    75,
    15,
    NOW() - INTERVAL '5 minutes',
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 11. 创建会话和消息
-- =============================================

-- 创建会话（用户1和用户5）
INSERT INTO conversations (
  id,
  participant_1_id,
  participant_2_id,
  last_message_content,
  last_message_at,
  last_sender_id,
  unread_count_p1,
  unread_count_p2
) VALUES
  (
    'conv-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    '55555555-5555-5555-5555-555555555555',
    '来了',
    NOW() - INTERVAL '2 hours',
    '55555555-5555-5555-5555-555555555555',
    1,
    0
  )
ON CONFLICT (participant_1_id, participant_2_id) DO NOTHING;

-- 创建消息
INSERT INTO messages (
  conversation_id,
  sender_id,
  message_type,
  content,
  created_at
) VALUES
  (
    'conv-1111-1111-1111-111111111111',
    '55555555-5555-5555-5555-555555555555',
    'text',
    '你好呀，今天的作业完成了吗？',
    NOW() - INTERVAL '3 hours'
  ),
  (
    'conv-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'text',
    '反正今天的作业已经做好了',
    NOW() - INTERVAL '2 hours 30 minutes'
  ),
  (
    'conv-1111-1111-1111-111111111111',
    '55555555-5555-5555-5555-555555555555',
    'text',
    '好',
    NOW() - INTERVAL '2 hours 20 minutes'
  ),
  (
    'conv-1111-1111-1111-111111111111',
    '55555555-5555-5555-5555-555555555555',
    'file',
    '这是我上次的作业 截图就可以了',
    NOW() - INTERVAL '2 hours 10 minutes'
  ),
  (
    'conv-1111-1111-1111-111111111111',
    '55555555-5555-5555-5555-555555555555',
    'text',
    '来了',
    NOW() - INTERVAL '2 hours'
  )
ON CONFLICT DO NOTHING;

-- 更新文件消息的附件信息
UPDATE messages 
SET 
  media_name = '20245825401510龙受工单11Linux系统安...',
  media_size = 2296217,
  media_type = 'application/pdf'
WHERE message_type = 'file' 
  AND conversation_id = 'conv-1111-1111-1111-111111111111';

-- =============================================
-- 12. 创建通知
-- =============================================

INSERT INTO notifications (
  user_id,
  type,
  title,
  content,
  sender_id,
  is_official,
  thumbnail_url,
  created_at
) VALUES
  -- 官方通知
  (
    '11111111-1111-1111-1111-111111111111',
    'official',
    '万圣节活动',
    '万圣节🎃投稿活动预热了！参与有机会获得焕星积分的！',
    '00000000-0000-0000-0000-000000000001',
    true,
    '/placeholder.jpg',
    NOW() - INTERVAL '1 day'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'official',
    '积分体系上线',
    '焕星全面上线积分体系，来看看积分用途吧。',
    '00000000-0000-0000-0000-000000000001',
    true,
    NULL,
    NOW() - INTERVAL '20 days'
  ),
  
  -- 点赞通知
  (
    '11111111-1111-1111-1111-111111111111',
    'like',
    NULL,
    '赞了您的作品',
    '22222222-2222-2222-2222-222222222222',
    false,
    '/blue-angel-ethereal.jpg',
    NOW() - INTERVAL '5 hours'
  ),
  
  -- 评论通知
  (
    '22222222-2222-2222-2222-222222222222',
    'comment',
    NULL,
    '评论了您的作品：又到了听罗生门的季节...',
    '33333333-3333-3333-3333-333333333333',
    false,
    '/girl-with-goldfish-artistic-photo.jpg',
    NOW() - INTERVAL '1 day'
  )
ON CONFLICT DO NOTHING;

-- =============================================
-- 13. 创建能量交易记录
-- =============================================

INSERT INTO energy_transactions (
  user_id,
  amount,
  balance_after,
  type,
  related_id,
  related_type,
  description,
  created_at
) VALUES
  -- 用户1的交易记录
  (
    '11111111-1111-1111-1111-111111111111',
    60,
    60,
    'reward',
    NULL,
    NULL,
    '新用户注册奖励',
    NOW() - INTERVAL '30 days'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    -20,
    40,
    'generation',
    'gen-1111-1111-1111-111111111111',
    'ai_generation',
    'AI视频生成 - 蓝调天使',
    NOW() - INTERVAL '2 days'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    10,
    50,
    'reward',
    NULL,
    NULL,
    '每日签到奖励',
    NOW() - INTERVAL '1 day'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    10,
    60,
    'reward',
    NULL,
    NULL,
    '每日签到奖励',
    NOW()
  )
ON CONFLICT DO NOTHING;

-- =============================================
-- 14. 创建搜索历史
-- =============================================

INSERT INTO search_history (user_id, keyword, created_at) VALUES
  ('11111111-1111-1111-1111-111111111111', '面具', NOW() - INTERVAL '2 days'),
  ('11111111-1111-1111-1111-111111111111', '证件照', NOW() - INTERVAL '5 days'),
  ('11111111-1111-1111-1111-111111111111', '万圣节', NOW() - INTERVAL '10 days')
ON CONFLICT DO NOTHING;

-- =============================================
-- 15. 创建浏览记录（用于推荐）
-- =============================================

INSERT INTO work_views (user_id, work_id, view_duration, is_completed) VALUES
  ('11111111-1111-1111-1111-111111111111', 'work-1111-1111-1111-111111111111', 30, true),
  ('11111111-1111-1111-1111-111111111111', 'work-4444-4444-4444-444444444444', 25, true),
  ('22222222-2222-2222-2222-222222222222', 'work-2222-2222-2222-222222222222', 15, false),
  ('22222222-2222-2222-2222-222222222222', 'work-3333-3333-3333-333333333333', 35, true)
ON CONFLICT DO NOTHING;

-- =============================================
-- 16. 创建用户兴趣标签
-- =============================================

INSERT INTO user_interests (user_id, tag, weight) VALUES
  ('11111111-1111-1111-1111-111111111111', 'AI', 1.5),
  ('11111111-1111-1111-1111-111111111111', '摄影', 1.2),
  ('11111111-1111-1111-1111-111111111111', '旅行', 1.0),
  ('22222222-2222-2222-2222-222222222222', '创意', 1.8),
  ('22222222-2222-2222-2222-222222222222', '艺术', 1.3),
  ('33333333-3333-3333-3333-333333333333', '时尚', 1.6),
  ('33333333-3333-3333-3333-333333333333', '美妆', 1.4)
ON CONFLICT (user_id, tag) DO NOTHING;

-- =============================================
-- 17. 更新统计数据（模拟真实数据）
-- =============================================

-- 更新用户1的统计
UPDATE users SET
  following_count = 3,
  works_count = 2,
  likes_received_count = 4
WHERE id = '11111111-1111-1111-1111-111111111111';

-- 更新用户2的统计
UPDATE users SET
  following_count = 2,
  followers_count = 1,
  works_count = 1,
  likes_received_count = 33
WHERE id = '22222222-2222-2222-2222-222222222222';

-- 更新用户3的统计
UPDATE users SET
  following_count = 0,
  followers_count = 72,
  works_count = 2,
  likes_received_count = 2857
WHERE id = '33333333-3333-3333-3333-333333333333';

-- =============================================
-- 18. 验证数据
-- =============================================

-- 检查用户数
SELECT COUNT(*) as total_users FROM users WHERE deleted_at IS NULL;

-- 检查作品数
SELECT COUNT(*) as total_works FROM works WHERE deleted_at IS NULL;

-- 检查关注关系
SELECT COUNT(*) as total_follows FROM follows;

-- 检查点赞数
SELECT COUNT(*) as total_likes FROM likes;

-- 检查评论数
SELECT COUNT(*) as total_comments FROM comments WHERE deleted_at IS NULL;

-- 检查AI模板数
SELECT COUNT(*) as total_templates FROM ai_templates WHERE status = 'active';

-- =============================================
-- 19. 查看测试用户信息
-- =============================================

SELECT 
  id,
  nickname,
  phone,
  energy_balance,
  following_count,
  followers_count,
  works_count,
  created_at
FROM users
WHERE phone LIKE 'test%' OR phone = 'official'
ORDER BY created_at;

-- =============================================
-- 20. 查看测试作品信息
-- =============================================

SELECT 
  w.id,
  u.nickname as author,
  w.title,
  w.type,
  w.views_count,
  w.likes_count,
  w.comments_count,
  w.uses_count,
  w.published_at
FROM works w
JOIN users u ON w.user_id = u.id
WHERE w.deleted_at IS NULL
ORDER BY w.published_at DESC;

-- =============================================
-- 完成
-- =============================================

SELECT '✅ 测试数据初始化完成！' as message;

-- 显示数据统计
SELECT 
  '用户数' as metric, COUNT(*)::text as value FROM users WHERE deleted_at IS NULL
UNION ALL
SELECT 
  '作品数', COUNT(*)::text FROM works WHERE deleted_at IS NULL
UNION ALL
SELECT 
  '关注关系', COUNT(*)::text FROM follows
UNION ALL
SELECT 
  '点赞数', COUNT(*)::text FROM likes
UNION ALL
SELECT 
  '评论数', COUNT(*)::text FROM comments WHERE deleted_at IS NULL
UNION ALL
SELECT 
  'AI模板', COUNT(*)::text FROM ai_templates WHERE status = 'active'
UNION ALL
SELECT 
  'AI生成记录', COUNT(*)::text FROM ai_generations
UNION ALL
SELECT 
  '消息数', COUNT(*)::text FROM messages
UNION ALL
SELECT 
  '通知数', COUNT(*)::text FROM notifications;

-- =============================================
-- 21. 形象与穿搭示例数据（Avatar Management）
-- =============================================

-- 为现有AI分身补充正脸与侧脸照片
UPDATE ai_avatars SET 
  front_face_url = '/placeholder-user.jpg',
  side_face_url = '/emoji-avatar-character.jpg',
  outfit_photo_1 = '/ai-portrait-autumn-leaves.jpg',
  outfit_photo_2 = '/ai-portrait-spring-flowers.jpg'
WHERE user_id = '11111111-1111-1111-1111-111111111111' AND name = '当前分身';

-- 为测试用户1新增第二个形象
INSERT INTO ai_avatars (
  user_id,
  name,
  avatar_url,
  front_face_url,
  side_face_url,
  version,
  is_active,
  status,
  created_at
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  '形象二：都会通勤风',
  '/ai-avatar-female.jpg',
  '/girl-with-goldfish-artistic-photo.jpg',
  '/aesthetic-filter-portrait.jpg',
  '2.0',
  false,
  'active',
  NOW() - INTERVAL '10 days'
) ON CONFLICT DO NOTHING;

-- 查询形象ID（仅供参考）
-- SELECT id, name FROM ai_avatars WHERE user_id = '11111111-1111-1111-1111-111111111111';

-- 为两个形象插入穿搭示例（每个3套）
INSERT INTO avatar_outfits (avatar_id, user_id, image_url, title, tags, created_at)
SELECT a.id, a.user_id, o.image_url, o.title, o.tags, NOW() - (o.offset || ' days')::INTERVAL
FROM (
  VALUES
    -- 形象一的穿搭
    ('当前分身', '/blue-angel-ethereal.jpg', '蓝调天使写真', ARRAY['蓝色','天使'], '2'),
    ('当前分身', '/cyberpunk-portrait-neon.jpg', '赛博朋克夜色', ARRAY['赛博朋克','霓虹'], '4'),
    ('当前分身', '/ai-portrait-autumn-leaves.jpg', '秋日森系', ARRAY['秋日','自然'], '6'),
    -- 形象二的穿搭
    ('形象二：都会通勤风', '/aesthetic-filter-portrait.jpg', '通勤氛围感', ARRAY['通勤','氛围'], '1'),
    ('形象二：都会通勤风', '/ai-portrait-spring-flowers.jpg', '春日花海通勤', ARRAY['春日','花海'], '3'),
    ('形象二：都会通勤风', '/girl-with-goldfish-artistic-photo.jpg', '金鱼艺术写真', ARRAY['艺术','金鱼'], '5')
) AS o(name, image_url, title, tags, offset)
JOIN ai_avatars a ON a.name = o.name AND a.user_id = '11111111-1111-1111-1111-111111111111'
ON CONFLICT DO NOTHING;

-- 验证形象与穿搭数量
SELECT 
  (SELECT COUNT(*) FROM ai_avatars WHERE user_id = '11111111-1111-1111-1111-111111111111') AS avatar_count_user1,
  (SELECT COUNT(*) FROM avatar_outfits ao JOIN ai_avatars a ON ao.avatar_id = a.id WHERE a.user_id = '11111111-1111-1111-1111-111111111111') AS outfit_count_user1;

