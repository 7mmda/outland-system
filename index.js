const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    StringSelectMenuBuilder,
    ChannelType,
    Colors
} = require('discord.js');
const fs = require('fs');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildVoiceStates
    ]
});

let systemData = {
    users: {},
    identities: {},
    suggestions: {},
    serverStatus: 'offline',
    serverCode: 'EMDEN001',
    messageIds: {},
    voiceTimers: {},
    gamesCooldown: {},
    achievements: {}
};

const CONFIG = {
    channels: {
        interior: null,
        bank: null,
        identity: null,
        games: null,
        suggestions: null,
        status: null
    }
};

const ACHIEVEMENTS = {
    firstLogin: { name: '🎯 أول دخول', desc: 'سجل دخولك الأول' },
    richman: { name: '💰 صاحب الملايين', desc: 'اجمع مليون دولار' },
    gameMaster: { name: '🎮 سيد الألعاب', desc: 'اربح 10 ألعاب' },
    voiceKing: { name: '🎙️ ملك الصوت', desc: 'اقضِ 5 ساعات في الروم الصوتي' }
};

const RANKS = [
    { name: 'مواطن عادي', minMoney: 0, emoji: '👤' },
    { name: 'تاجر متوسط', minMoney: 5000, emoji: '💼' },
    { name: 'بطاقة برونزية', minMoney: 15000, emoji: '🥉' },
    { name: 'رجل أعمال', minMoney: 50000, emoji: '🏢' },
    { name: 'بطاقة ذهبية', minMoney: 50000, emoji: '🥇' },
    { name: 'بطاقة بلاتينيوم', minMoney: 1000000, emoji: '💎' },
    { name: 'بطاقة أوت لاند ماستر', minMoney: 5000000, emoji: '👑' }
];

function loadData() {
    try {
        if (fs.existsSync('data.json')) {
            const loaded = JSON.parse(fs.readFileSync('data.json', 'utf8'));
            systemData = {
                users: loaded.users || {},
                identities: loaded.identities || {},
                suggestions: loaded.suggestions || {},
                serverStatus: loaded.serverStatus || 'offline',
                serverCode: loaded.serverCode || 'EMDEN001',
                messageIds: loaded.messageIds || {},
                voiceTimers: loaded.voiceTimers || {},
                gamesCooldown: loaded.gamesCooldown || {},
                achievements: loaded.achievements || {},
                channels: loaded.channels || {}
            };
        }
    } catch (error) {
        console.error('خطأ في تحميل البيانات:', error);
    }
}

function saveData() {
    try {
        fs.writeFileSync('data.json', JSON.stringify(systemData, null, 2));
    } catch (error) {
        console.error('خطأ:', error);
    }
}

function initializeUser(userId) {
    if (!systemData.users[userId]) {
        systemData.users[userId] = {
            name: 'غير محدد',
            status: 'offline',
            unit: 'بدون يونت',
            loginTime: null,
            money: 0,
            points: 0,
            gamesWon: 0,
            gamesLost: 0,
            achievements: [],
            totalVoiceTime: 0,
            level: 1,
            exp: 0
        };
        saveData();
    } else {
        // تأكد من وجود كل الحقول للمستخدمين القدماء
        const user = systemData.users[userId];
        if (!user.achievements) user.achievements = [];
        if (user.level === undefined) user.level = 1;
        if (user.exp === undefined) user.exp = 0;
        if (user.totalVoiceTime === undefined) user.totalVoiceTime = 0;
        if (user.points === undefined) user.points = 0;
    }
}

function getRank(money) {
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (money >= RANKS[i].minMoney) return RANKS[i];
    }
    return RANKS[0];
}

function addExp(userId, amount) {
    const user = systemData.users[userId];
    if (!user) return false;
    
    user.exp = (user.exp || 0) + amount;
    const level = user.level || 1;
    const nextLevelExp = level * 500;
    if (user.exp >= nextLevelExp) {
        user.level = level + 1;
        user.exp = 0;
        user.money += 1000;
        return true;
    }
    return false;
}

function checkAchievement(userId) {
    const user = systemData.users[userId];
    if (!user) return;
    
    if (!user.achievements) user.achievements = [];
    
    if (!user.achievements.includes('firstLogin') && user.status === 'online') {
        user.achievements.push('firstLogin');
    }
    if (!user.achievements.includes('richman') && user.money >= 1000000) {
        user.achievements.push('richman');
    }
    if (!user.achievements.includes('gameMaster') && user.gamesWon >= 10) {
        user.achievements.push('gameMaster');
    }
    saveData();
}

async function updateInteriorMessage() {
    try {
        if (!systemData.channels.interior || !systemData.messageIds.interior) return;
        
        const channel = await client.channels.fetch(systemData.channels.interior);
        const message = await channel.messages.fetch(systemData.messageIds.interior);
        
        const onlineUsers = Object.entries(systemData.users)
            .filter(([_, data]) => data.status === 'online');
        
        let onlineList = '';
        if (onlineUsers.length > 0) {
            onlineUsers.forEach(([_, user]) => {
                onlineList += `✅ **${user.name}** - ${user.unit}\n`;
            });
        } else {
            onlineList = '*لا يوجد حاضرين*';
        }
        
        const embed = new EmbedBuilder()
            .setColor('#FF3333')
            .setTitle('🏛️ وزارة الداخلية')
            .setDescription('نظام تسجيل الحضور والانصراف للضباط مع نظام النقاط')
            .addFields(
                { name: '👥 الحاضرين الآن', value: onlineList, inline: false }
            )
            .setFooter({ text: `عدد الحاضرين: ${onlineUsers.length}` });
        
        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('interior_menu')
                    .setPlaceholder('اختر خدمة...')
                    .addOptions([
                        { label: 'تسجيل دخول', value: 'interior_login', emoji: '✅' },
                        { label: 'تسجيل خروج', value: 'interior_logout', emoji: '❌' },
                        { label: 'تغيير يونت', value: 'interior_unit', emoji: '🚔' },
                        { label: 'قائمة الحاضرين', value: 'interior_officers', emoji: '👥' },
                        { label: 'ملفي الشخصي', value: 'interior_profile', emoji: '📊' }
                    ])
            );
        
        await message.edit({ embeds: [embed], components: [row] });
    } catch (e) {
        console.log('⚠️ خطأ في تحديث رسالة الداخلية');
    }
}

loadData();

async function restoreMessages() {
    try {
        if (!systemData.messageIds || Object.keys(systemData.messageIds).length === 0) {
            console.log('⚠️ لا توجد رسائل محفوظة - حط الأنظمة باستخدام /setup');
            return;
        }

        console.log('✅ البيانات والرسائل جاهزة للاستخدام');
    } catch (error) {
        console.log('⚠️ خطأ:', error.message);
    }
}

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const commands = [
    new SlashCommandBuilder()
        .setName('setup')
        .setDescription('إعداد البوت (للادمن فقط)')
        .addStringOption(option =>
            option.setName('system')
                .setDescription('الـ System')
                .setRequired(true)
                .addChoices(
                    { name: 'وزارة الداخلية', value: 'interior' },
                    { name: 'البنك', value: 'bank' },
                    { name: 'الهوية', value: 'identity' },
                    { name: 'الألعاب', value: 'games' },
                    { name: 'الاقتراحات', value: 'suggestions' },
                    { name: 'حالة السيرفر', value: 'status' }
                )),
    new SlashCommandBuilder()
        .setName('policeadmin')
        .setDescription('قادات الشرطة - إدارة النقاط (للادمن فقط)'),
    new SlashCommandBuilder()
        .setName('bankadmin')
        .setDescription('إدارة البنك - إضافة وإزالة أموال (للادمن فقط)'),
    new SlashCommandBuilder()
        .setName('serveron')
        .setDescription('تشغيل السيرفر (للادمن فقط)'),
    new SlashCommandBuilder()
        .setName('serveroff')
        .setDescription('إيقاف السيرفر (للادمن فقط)'),
    new SlashCommandBuilder()
        .setName('servercode')
        .setDescription('تغيير كود السيرفر (للادمن فقط)')
        .addStringOption(option =>
            option.setName('code')
                .setDescription('الكود الجديد')
                .setRequired(true))
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('📝 جاري تسجيل الأوامر...');
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
        console.log('✅ تم تسجيل الأوامر');
    } catch (error) {
        console.error('❌ خطأ:', error);
    }
})();

client.once('ready', async () => {
    console.log(`✅ متصل: ${client.user.tag}`);
    client.user.setActivity('🎮 Emergency Emden RP', { type: 'PLAYING' });
    
    setTimeout(() => {
        restoreMessages();
    }, 2000);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, user } = interaction;

    if (commandName === 'setup') {
        if (!interaction.member.permissions.has('Administrator')) {
            return await interaction.reply({ content: '❌ ليس لديك صلاحيات!', ephemeral: true });
        }

        const system = interaction.options.getString('system');
        const channel = interaction.channel;

        const systemConfigs = {
            interior: {
                color: '#FF3333',
                title: '🏛️ وزارة الداخلية',
                description: 'نظام تسجيل الحضور والانصراف للضباط مع نظام النقاط',
                menu: [
                    { label: 'تسجيل دخول', value: 'interior_login', emoji: '✅' },
                    { label: 'تسجيل خروج', value: 'interior_logout', emoji: '❌' },
                    { label: 'تغيير يونت', value: 'interior_unit', emoji: '🚔' },
                    { label: 'قائمة الحاضرين', value: 'interior_officers', emoji: '👥' },
                    { label: 'ملفي الشخصي', value: 'interior_profile', emoji: '📊' }
                ]
            },
            bank: {
                color: '#FFD700',
                title: '🏦 البنك',
                description: 'نظام البنك والأموال المتطور',
                buttons: [
                    { id: 'bank_balance', label: '💰 رصيدي', style: ButtonStyle.Primary },
                    { id: 'bank_leaderboard', label: '🏆 لوحة المتصدرين', style: ButtonStyle.Success }
                ]
            },
            games: {
                color: '#AA00FF',
                title: '🎮 الألعاب',
                description: 'ألعاب متعددة مع مكافآت! (cooldown: 10 دقائق)',
                buttons: [
                    { id: 'game_dice', label: '🎲 النرد', style: ButtonStyle.Primary },
                    { id: 'game_coin', label: '🪙 العملة', style: ButtonStyle.Primary },
                    { id: 'game_memory', label: '🧠 الذاكرة', style: ButtonStyle.Primary }
                ]
            }
        };

        if (system === 'interior') {
            const config = systemConfigs.interior;
            const embed = new EmbedBuilder()
                .setColor(config.color)
                .setTitle(config.title)
                .setDescription(config.description)
                .setThumbnail('attachment://server-icon.jpeg')
                .setImage('attachment://server-banner.png')
                .setFooter({ text: 'Emergency Emden - Advanced System V14' });

            const row = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('interior_menu')
                        .setPlaceholder('اختر خدمة...')
                        .addOptions(config.menu)
                );

            try {
                const msg = await channel.send({ 
                    embeds: [embed], 
                    components: [row], 
                    files: ['./server-banner.png', './server-icon.jpeg'] 
                });
                CONFIG.channels.interior = channel.id;
                systemData.messageIds.interior = msg.id;
                systemData.channels = systemData.channels || {};
                systemData.channels.interior = channel.id;
                saveData();
                await interaction.reply({ content: '✅ تم الإعداد', ephemeral: true });
            } catch (e) {
                const msg = await channel.send({ embeds: [embed], components: [row] });
                CONFIG.channels.interior = channel.id;
                systemData.messageIds.interior = msg.id;
                systemData.channels = systemData.channels || {};
                systemData.channels.interior = channel.id;
                saveData();
                await interaction.reply({ content: '✅ تم الإعداد', ephemeral: true });
            }
        }

        else if (system === 'bank') {
            const config = systemConfigs.bank;
            const embed = new EmbedBuilder()
                .setColor(config.color)
                .setTitle(config.title)
                .setDescription(config.description)
                .setThumbnail('attachment://server-icon.jpeg')
                .setImage('attachment://server-banner.png')
                .setFooter({ text: 'Emergency Emden - Advanced Banking System' });

            const row1 = new ActionRowBuilder()
                .addComponents(config.buttons.slice(0, 3).map(btn => 
                    new ButtonBuilder()
                        .setCustomId(btn.id)
                        .setLabel(btn.label)
                        .setStyle(btn.style)
                ));

            try {
                const msg = await channel.send({ 
                    embeds: [embed], 
                    components: [row1], 
                    files: ['./server-banner.png', './server-icon.jpeg'] 
                });
                CONFIG.channels.bank = channel.id;
                systemData.messageIds.bank = msg.id;
                systemData.channels = systemData.channels || {};
                systemData.channels.bank = channel.id;
                saveData();
                await interaction.reply({ content: '✅ تم الإعداد', ephemeral: true });
            } catch (e) {
                const msg = await channel.send({ embeds: [embed], components: [row1] });
                CONFIG.channels.bank = channel.id;
                systemData.messageIds.bank = msg.id;
                systemData.channels = systemData.channels || {};
                systemData.channels.bank = channel.id;
                saveData();
                await interaction.reply({ content: '✅ تم الإعداد', ephemeral: true });
            }
        }

        else if (system === 'identity') {
            const embed = new EmbedBuilder()
                .setColor('#0099FF')
                .setTitle('🆔 الهوية الشخصية')
                .setDescription('نظام الهوية المتقدم')
                .setThumbnail('attachment://server-icon.jpeg')
                .setImage('attachment://server-banner.png')
                .setFooter({ text: 'Emergency Emden - Identity System' });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('identity_create')
                        .setLabel('إنشاء هوية')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('identity_view')
                        .setLabel('عرض الهوية')
                        .setStyle(ButtonStyle.Secondary)
                );

            try {
                const msg = await channel.send({ 
                    embeds: [embed], 
                    components: [row], 
                    files: ['./server-banner.png', './server-icon.jpeg'] 
                });
                CONFIG.channels.identity = channel.id;
                systemData.messageIds.identity = msg.id;
                systemData.channels = systemData.channels || {};
                systemData.channels.identity = channel.id;
                saveData();
                await interaction.reply({ content: '✅ تم الإعداد', ephemeral: true });
            } catch (e) {
                const msg = await channel.send({ embeds: [embed], components: [row] });
                CONFIG.channels.identity = channel.id;
                systemData.messageIds.identity = msg.id;
                systemData.channels = systemData.channels || {};
                systemData.channels.identity = channel.id;
                saveData();
                await interaction.reply({ content: '✅ تم الإعداد', ephemeral: true });
            }
        }

        else if (system === 'games') {
            const config = systemConfigs.games;
            const embed = new EmbedBuilder()
                .setColor(config.color)
                .setTitle(config.title)
                .setDescription(config.description)
                .setThumbnail('attachment://server-icon.jpeg')
                .setImage('attachment://server-banner.png')
                .setFooter({ text: 'Emergency Emden - Games System' });

            const row = new ActionRowBuilder()
                .addComponents(config.buttons.map(btn => 
                    new ButtonBuilder()
                        .setCustomId(btn.id)
                        .setLabel(btn.label)
                        .setStyle(btn.style)
                ));

            try {
                const msg = await channel.send({ 
                    embeds: [embed], 
                    components: [row], 
                    files: ['./server-banner.png', './server-icon.jpeg'] 
                });
                CONFIG.channels.games = channel.id;
                systemData.messageIds.games = msg.id;
                systemData.channels = systemData.channels || {};
                systemData.channels.games = channel.id;
                saveData();
                await interaction.reply({ content: '✅ تم الإعداد', ephemeral: true });
            } catch (e) {
                const msg = await channel.send({ embeds: [embed], components: [row] });
                CONFIG.channels.games = channel.id;
                systemData.messageIds.games = msg.id;
                systemData.channels = systemData.channels || {};
                systemData.channels.games = channel.id;
                saveData();
                await interaction.reply({ content: '✅ تم الإعداد', ephemeral: true });
            }
        }

        else if (system === 'suggestions') {
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('💡 الاقتراحات')
                .setDescription('نظام الاقتراحات المتطور')
                .setThumbnail('attachment://server-icon.jpeg')
                .setImage('attachment://server-banner.png')
                .setFooter({ text: 'Emergency Emden - Suggestions' });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('suggest_submit')
                        .setLabel('إرسال اقتراح')
                        .setStyle(ButtonStyle.Primary)
                );

            try {
                const msg = await channel.send({ 
                    embeds: [embed], 
                    components: [row], 
                    files: ['./server-banner.png', './server-icon.jpeg'] 
                });
                CONFIG.channels.suggestions = channel.id;
                systemData.messageIds.suggestions = msg.id;
                systemData.channels = systemData.channels || {};
                systemData.channels.suggestions = channel.id;
                saveData();
                await interaction.reply({ content: '✅ تم الإعداد', ephemeral: true });
            } catch (e) {
                const msg = await channel.send({ embeds: [embed], components: [row] });
                CONFIG.channels.suggestions = channel.id;
                systemData.messageIds.suggestions = msg.id;
                systemData.channels = systemData.channels || {};
                systemData.channels.suggestions = channel.id;
                saveData();
                await interaction.reply({ content: '✅ تم الإعداد', ephemeral: true });
            }
        }

        else if (system === 'status') {
            const statusEmoji = systemData.serverStatus === 'online' ? '🟢' : '🔴';
            const statusText = systemData.serverStatus === 'online' ? 'أونلاين' : 'أوفلاين';

            const embed = new EmbedBuilder()
                .setColor(systemData.serverStatus === 'online' ? Colors.Green : Colors.Red)
                .setTitle(`📡 حالة السيرفر ${statusEmoji}`)
                .setDescription(`**${statusText}**`)
                .addFields(
                    { name: '🔐 كود الدخول', value: `\`\`\`${systemData.serverCode}\`\`\``, inline: false }
                )
                .setThumbnail('attachment://server-icon.jpeg')
                .setImage('attachment://server-banner.png')
                .setFooter({ text: 'Emergency Emden - Server Status' });

            try {
                const msg = await channel.send({ 
                    embeds: [embed], 
                    files: ['./server-banner.png', './server-icon.jpeg'] 
                });
                CONFIG.channels.status = channel.id;
                systemData.messageIds.status = msg.id;
                systemData.channels = systemData.channels || {};
                systemData.channels.status = channel.id;
                saveData();
                await interaction.reply({ content: '✅ تم الإعداد', ephemeral: true });
            } catch (e) {
                const msg = await channel.send({ embeds: [embed] });
                CONFIG.channels.status = channel.id;
                systemData.messageIds.status = msg.id;
                systemData.channels = systemData.channels || {};
                systemData.channels.status = channel.id;
                saveData();
                await interaction.reply({ content: '✅ تم الإعداد', ephemeral: true });
            }
        }
    }

    else if (commandName === 'policeadmin') {
        if (!interaction.member.permissions.has('Administrator')) {
            return await interaction.reply({ content: '❌ صلاحيات غير كافية', ephemeral: true });
        }

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('police_admin_menu')
                    .setPlaceholder('اختر العملية...')
                    .addOptions([
                        { label: 'إضافة نقاط', value: 'admin_add_points', emoji: '➕' },
                        { label: 'إزالة نقاط', value: 'admin_remove_points', emoji: '➖' },
                        { label: 'عدد الدخول', value: 'admin_login_count', emoji: '📊' },
                        { label: 'النقاط', value: 'admin_get_points', emoji: '💵' }
                    ])
            );

        await interaction.reply({ 
            content: '👮 **إدارة نقاط الضباط**',
            components: [row], 
            ephemeral: false 
        });
    }

    else if (commandName === 'bankadmin') {
        if (!interaction.member.permissions.has('Administrator')) {
            return await interaction.reply({ content: '❌ صلاحيات غير كافية', ephemeral: true });
        }

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('bank_admin_menu')
                    .setPlaceholder('اختر العملية...')
                    .addOptions([
                        { label: 'إضافة مال', value: 'bank_add', emoji: '➕' },
                        { label: 'إزالة مال', value: 'bank_remove', emoji: '➖' },
                        { label: 'تعديل الرصيد', value: 'bank_edit', emoji: '✏️' }
                    ])
            );

        await interaction.reply({ 
            content: '🏦 **إدارة البنك**',
            components: [row], 
            ephemeral: false 
        });
    }

    else if (commandName === 'serveron') {
        if (!interaction.member.permissions.has('Administrator')) {
            return await interaction.reply({ content: '❌ صلاحيات غير كافية', ephemeral: true });
        }

        systemData.serverStatus = 'online';
        saveData();

        const embed = new EmbedBuilder()
            .setColor(Colors.Green)
            .setTitle('📡 حالة السيرفر 🟢')
            .setDescription('**أونلاين**')
            .addFields(
                { name: '🔐 كود الدخول', value: `\`\`\`${systemData.serverCode}\`\`\``, inline: false }
            )
            .setThumbnail('attachment://server-icon.jpeg')
            .setFooter({ text: 'Emergency Emden - Server Status' });

        try {
            const statusChannel = await client.channels.fetch(CONFIG.channels.status);
            const statusMsg = await statusChannel.messages.fetch(systemData.messageIds.status);
            await statusMsg.delete();
        } catch (e) {}

        try {
            const statusChannel = await client.channels.fetch(CONFIG.channels.status);
            const msg = await statusChannel.send({ 
                embeds: [embed],
                files: ['./server-banner.png', './server-icon.jpeg']
            });
            systemData.messageIds.status = msg.id;
            saveData();
        } catch (e) {
            const statusChannel = await client.channels.fetch(CONFIG.channels.status);
            const msg = await statusChannel.send({ embeds: [embed] });
            systemData.messageIds.status = msg.id;
            saveData();
        }

        await interaction.reply({ content: '✅ السيرفر تشغيل الآن 🟢', ephemeral: true });
    }

    else if (commandName === 'serveroff') {
        if (!interaction.member.permissions.has('Administrator')) {
            return await interaction.reply({ content: '❌ صلاحيات غير كافية', ephemeral: true });
        }

        systemData.serverStatus = 'offline';
        saveData();

        const embed = new EmbedBuilder()
            .setColor(Colors.Red)
            .setTitle('📡 حالة السيرفر 🔴')
            .setDescription('**أوفلاين**')
            .addFields(
                { name: '🔐 كود الدخول', value: `\`\`\`${systemData.serverCode}\`\`\``, inline: false }
            )
            .setThumbnail('attachment://server-icon.jpeg')
            .setFooter({ text: 'Emergency Emden - Server Status' });

        try {
            const statusChannel = await client.channels.fetch(CONFIG.channels.status);
            const statusMsg = await statusChannel.messages.fetch(systemData.messageIds.status);
            await statusMsg.edit({ embeds: [embed] });
        } catch (e) {}

        await interaction.reply({ content: '✅ السيرفر إيقاف الآن 🔴', ephemeral: true });
    }

    else if (commandName === 'servercode') {
        if (!interaction.member.permissions.has('Administrator')) {
            return await interaction.reply({ content: '❌ صلاحيات غير كافية', ephemeral: true });
        }

        const newCode = interaction.options.getString('code');
        systemData.serverCode = newCode;
        saveData();

        const statusEmoji = systemData.serverStatus === 'online' ? '🟢' : '🔴';
        const statusText = systemData.serverStatus === 'online' ? 'أونلاين' : 'أوفلاين';
        const color = systemData.serverStatus === 'online' ? Colors.Green : Colors.Red;

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(`📡 حالة السيرفر ${statusEmoji}`)
            .setDescription(`**${statusText}**`)
            .addFields(
                { name: '🔐 كود الدخول', value: `\`\`\`${systemData.serverCode}\`\`\``, inline: false }
            )
            .setThumbnail('attachment://server-icon.jpeg')
            .setFooter({ text: 'Emergency Emden - Server Status' });

        try {
            const statusChannel = await client.channels.fetch(CONFIG.channels.status);
            const statusMsg = await statusChannel.messages.fetch(systemData.messageIds.status);
            await statusMsg.edit({ embeds: [embed] });
        } catch (e) {}

        await interaction.reply({ content: `✅ تم تغيير الكود إلى: \`${newCode}\``, ephemeral: true });
    }
});

client.on('interactionCreate', async interaction => {
    if (interaction.isStringSelectMenu()) {
        const { customId, user, values, channel } = interaction;
        const userId = user.id;
        initializeUser(userId);

        if (customId === 'interior_menu') {
            const choice = values[0];

            if (choice === 'interior_login') {
                systemData.users[userId].status = 'online';
                systemData.users[userId].loginTime = new Date().toLocaleString('ar-SA');
                systemData.users[userId].points += 2;
                addExp(userId, 50);
                checkAchievement(userId);
                saveData();

                const embed = new EmbedBuilder()
                    .setColor(Colors.Green)
                    .setTitle('✅ تسجيل دخول')
                    .addFields(
                        { name: '👤 الشخص', value: systemData.users[userId].name, inline: true },
                        { name: '⏰ الوقت', value: systemData.users[userId].loginTime, inline: true },
                        { name: '📍 الوحدة', value: systemData.users[userId].unit, inline: true },
                        { name: '💵 النقاط المضافة', value: '+2 🎯', inline: true }
                    );

                await channel.send({ embeds: [embed] });
                await updateInteriorMessage();
                await interaction.reply({ content: '✅ تم التسجيل بنجاح + 2 نقاط', ephemeral: true });
            }

            else if (choice === 'interior_logout') {
                systemData.users[userId].status = 'offline';
                saveData();

                const embed = new EmbedBuilder()
                    .setColor(Colors.Red)
                    .setTitle('❌ تسجيل خروج')
                    .addFields({ name: '👤 الشخص', value: systemData.users[userId].name });

                await channel.send({ embeds: [embed] });
                await updateInteriorMessage();
                await interaction.reply({ content: '✅ تم التسجيل', ephemeral: true });
            }

            else if (choice === 'interior_unit') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_unit')
                    .setTitle('تغيير اليونت')
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('unit_name')
                                .setLabel('اسم اليونت')
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder('Unit-Alpha')
                                .setRequired(true)
                        )
                    );

                await interaction.showModal(modal);
            }

            else if (choice === 'interior_officers') {
                const onlineUsers = Object.entries(systemData.users)
                    .filter(([_, data]) => data.status === 'online');

                if (onlineUsers.length === 0) {
                    return await interaction.reply({ content: '❌ لا يوجد حاضرين', ephemeral: true });
                }

                let description = '';
                onlineUsers.forEach(([id, user], index) => {
                    description += `${index + 1}. **${user.name}** - ${user.unit}\n`;
                });

                const embed = new EmbedBuilder()
                    .setColor(Colors.Blue)
                    .setTitle(`👥 قائمة الحاضرين (${onlineUsers.length})`)
                    .setDescription(description)
                    .setFooter({ text: 'نظام الحاضرين' });

                await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            else if (choice === 'interior_profile') {
                const user = systemData.users[userId];
                const rank = getRank(user.points);

                const embed = new EmbedBuilder()
                    .setColor(Colors.Purple)
                    .setTitle('📋 ملفي الشخصي')
                    .addFields(
                        { name: '👤 الاسم', value: user.name, inline: true },
                        { name: '⚔️ رتبة', value: `${rank.emoji} ${rank.name}`, inline: true },
                        { name: '💵 النقاط', value: `${user.points}`, inline: true }
                    );

                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }

        else if (customId === 'police_admin_menu') {
            const choice = values[0];

            if (choice === 'admin_add_points') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_admin_add_points')
                    .setTitle('إضافة نقاط')
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('user_id')
                                .setLabel('ID المستخدم')
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('amount')
                                .setLabel('عدد النقاط')
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                        )
                    );

                await interaction.showModal(modal);
            }

            else if (choice === 'admin_remove_points') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_admin_remove_points')
                    .setTitle('إزالة نقاط')
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('user_id')
                                .setLabel('ID المستخدم')
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('amount')
                                .setLabel('عدد النقاط')
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                        )
                    );

                await interaction.showModal(modal);
            }

            else if (choice === 'admin_login_count') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_admin_login_count')
                    .setTitle('عدد مرات الدخول')
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('user_id')
                                .setLabel('ID المستخدم')
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                        )
                    );

                await interaction.showModal(modal);
            }

            else if (choice === 'admin_get_points') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_admin_get_points')
                    .setTitle('عرض نقاط الشخص')
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('user_id')
                                .setLabel('ID المستخدم')
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                        )
                    );

                await interaction.showModal(modal);
            }
        }

        else if (customId === 'bank_admin_menu') {
            const choice = values[0];

            if (choice === 'bank_add') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_bank_add')
                    .setTitle('إضافة مال')
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('user_id')
                                .setLabel('ID المستخدم')
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('amount')
                                .setLabel('المبلغ')
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                        )
                    );

                await interaction.showModal(modal);
            }

            else if (choice === 'bank_remove') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_bank_remove')
                    .setTitle('إزالة مال')
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('user_id')
                                .setLabel('ID المستخدم')
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('amount')
                                .setLabel('المبلغ')
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                        )
                    );

                await interaction.showModal(modal);
            }

            else if (choice === 'bank_edit') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_bank_edit')
                    .setTitle('تعديل الرصيد')
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('user_id')
                                .setLabel('ID المستخدم')
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('amount')
                                .setLabel('الرصيد الجديد')
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                        )
                    );

                await interaction.showModal(modal);
            }
        }
    }

    else if (interaction.isButton()) {
        const { customId, user, channel } = interaction;
        const userId = user.id;
        initializeUser(userId);

        if (customId === 'identity_create') {
            const modal = new ModalBuilder()
                .setCustomId('modal_identity')
                .setTitle('إنشاء هوية')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('identity_name')
                            .setLabel('الاسم')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('identity_age')
                            .setLabel('العمر')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('identity_birthplace')
                            .setLabel('مكان الولادة')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('identity_job')
                            .setLabel('الوظيفة')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    )
                );

            await interaction.showModal(modal);
        }

        else if (customId === 'identity_view') {
            const identity = systemData.identities[userId];

            if (!identity) {
                return await interaction.reply({ content: '❌ لم تنشئ هوية', ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setColor(Colors.Aqua)
                .setTitle('🆔 بطاقة الهوية')
                .setThumbnail('attachment://server-icon.jpeg')
                .addFields(
                    { name: '👤 الاسم', value: identity.name, inline: true },
                    { name: '📅 العمر', value: identity.age, inline: true },
                    { name: '🏘️ مكان الولادة', value: identity.birthplace, inline: false },
                    { name: '💼 الوظيفة', value: identity.job, inline: false }
                )
                .setFooter({ text: 'Emergency Emden ID' });

            try {
                await interaction.reply({ embeds: [embed], files: ['./server-icon.jpeg'], ephemeral: true });
            } catch (e) {
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }

        else if (customId === 'bank_balance') {
            const user = systemData.users[userId];
            const rank = getRank(user.money);

            const embed = new EmbedBuilder()
                .setColor(Colors.Gold)
                .setTitle('💰 حسابك البنكي')
                .setThumbnail('attachment://server-icon.jpeg')
                .addFields(
                    { name: 'الرصيد', value: `💵 $${user.money}`, inline: true },
                    { name: 'الرتبة', value: `${rank.emoji} ${rank.name}`, inline: true },
                    { name: 'المستوى', value: `${user.level}`, inline: true },
                    { name: 'الخبرة', value: `${user.exp}/${user.level * 500}`, inline: true }
                );

            try {
                await interaction.reply({ embeds: [embed], files: ['./server-icon.jpeg'], ephemeral: true });
            } catch (e) {
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }

        else if (customId === 'bank_leaderboard') {
            const sorted = Object.entries(systemData.users)
                .sort((a, b) => b[1].money - a[1].money)
                .slice(0, 10);

            if (sorted.length === 0) {
                return await interaction.reply({ content: '❌ لا توجد بيانات', ephemeral: true });
            }

            let description = '';
            sorted.forEach(([id, user], index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                const rank = getRank(user.money);
                description += `\n${medal} **${user.name}** ${rank.emoji}\n💰 $${user.money}`;
            });

            const embed = new EmbedBuilder()
                .setColor(Colors.Gold)
                .setTitle('🏆 لوحة المتصدرين')
                .setDescription(description)
                .setThumbnail('attachment://server-icon.jpeg')
                .setFooter({ text: 'أغنى 10 أشخاص' });

            try {
                await interaction.reply({ embeds: [embed], files: ['./server-icon.jpeg'], ephemeral: true });
            } catch (e) {
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }

        else if (customId === 'game_dice') {
            const now = Date.now();
            const lastGame = systemData.gamesCooldown[userId] || 0;
            const cooldown = 10 * 60 * 1000;

            if ((now - lastGame) < cooldown) {
                const remaining = Math.ceil((cooldown - (now - lastGame)) / 1000 / 60);
                return await interaction.reply({ content: `⏳ انتظر ${remaining} دقيقة`, ephemeral: true });
            }

            const userRoll = Math.floor(Math.random() * 6) + 1;
            const botRoll = Math.floor(Math.random() * 6) + 1;

            let result = '';
            let reward = 0;
            if (userRoll > botRoll) {
                result = '✅ فزت!';
                reward = 500;
                systemData.users[userId].money += 500;
                systemData.users[userId].gamesWon += 1;
            } else if (userRoll < botRoll) {
                result = '❌ خسرت';
                systemData.users[userId].gamesLost += 1;
            } else {
                result = '🤝 تعادل';
            }

            addExp(userId, 25);
            systemData.gamesCooldown[userId] = now;
            checkAchievement(userId);
            saveData();

            const embed = new EmbedBuilder()
                .setColor(userRoll > botRoll ? Colors.Green : Colors.Red)
                .setTitle('🎲 رمية النرد')
                .addFields(
                    { name: 'رمايتك', value: `${userRoll}`, inline: true },
                    { name: 'رميتي', value: `${botRoll}`, inline: true },
                    { name: 'النتيجة', value: result, inline: false },
                    { name: '💰 المكافأة', value: reward > 0 ? `+$${reward}` : 'بدون', inline: true },
                    { name: '📊 المستوى', value: systemData.users[userId].level.toString(), inline: true }
                );

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        else if (customId === 'game_coin') {
            const now = Date.now();
            const lastGame = systemData.gamesCooldown[userId] || 0;
            const cooldown = 10 * 60 * 1000;

            if ((now - lastGame) < cooldown) {
                const remaining = Math.ceil((cooldown - (now - lastGame)) / 1000 / 60);
                return await interaction.reply({ content: `⏳ انتظر ${remaining} دقيقة`, ephemeral: true });
            }

            const choices = ['وجه', 'نقش'];
            const userChoice = choices[Math.floor(Math.random() * 2)];
            const botChoice = choices[Math.floor(Math.random() * 2)];

            let result = '';
            let reward = 0;
            if (userChoice === botChoice) {
                result = '✅ فزت!';
                reward = 300;
                systemData.users[userId].money += 300;
                systemData.users[userId].gamesWon += 1;
            } else {
                result = '❌ خسرت';
                systemData.users[userId].gamesLost += 1;
            }

            addExp(userId, 15);
            systemData.gamesCooldown[userId] = now;
            checkAchievement(userId);
            saveData();

            const embed = new EmbedBuilder()
                .setColor(reward > 0 ? Colors.Green : Colors.Red)
                .setTitle('🪙 رمية العملة')
                .addFields(
                    { name: 'اختيارك', value: userChoice, inline: true },
                    { name: 'النتيجة', value: botChoice, inline: true },
                    { name: 'الحالة', value: result, inline: false },
                    { name: '💰 المكافأة', value: reward > 0 ? `+$${reward}` : 'بدون', inline: true }
                );

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        else if (customId === 'game_memory') {
            const now = Date.now();
            const lastGame = systemData.gamesCooldown[userId] || 0;
            const cooldown = 10 * 60 * 1000;

            if ((now - lastGame) < cooldown) {
                const remaining = Math.ceil((cooldown - (now - lastGame)) / 1000 / 60);
                return await interaction.reply({ content: `⏳ انتظر ${remaining} دقيقة`, ephemeral: true });
            }

            systemData.gamesCooldown[userId] = now;
            saveData();

            const embed = new EmbedBuilder()
                .setColor(Colors.Purple)
                .setTitle('🧠 لعبة الذاكرة')
                .setDescription('تذكر الأرقام الأربعة!')
                .addFields({ name: '🎯 الأرقام', value: '[1, 4, 7, 2]' });

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        else if (customId === 'suggest_submit') {
            const modal = new ModalBuilder()
                .setCustomId('modal_suggestion')
                .setTitle('إرسال اقتراح')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('suggestion_text')
                            .setLabel('الاقتراح')
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(true)
                    )
                );

            await interaction.showModal(modal);
        }

        else if (customId.startsWith('suggest_upvote_')) {
            const suggestionId = customId.replace('suggest_upvote_', '');
            
            if (!systemData.suggestions[suggestionId]) {
                return await interaction.reply({ content: '❌ لم يعد متاح', ephemeral: true });
            }

            systemData.suggestions[suggestionId].upvotes += 1;
            saveData();

            await interaction.reply({ content: `✅ شكراً على التصويت (👍 ${systemData.suggestions[suggestionId].upvotes})`, ephemeral: true });
        }

        else if (customId.startsWith('suggest_downvote_')) {
            const suggestionId = customId.replace('suggest_downvote_', '');
            
            if (!systemData.suggestions[suggestionId]) {
                return await interaction.reply({ content: '❌ لم يعد متاح', ephemeral: true });
            }

            systemData.suggestions[suggestionId].downvotes += 1;
            saveData();

            await interaction.reply({ content: `✅ شكراً على التصويت (👎 ${systemData.suggestions[suggestionId].downvotes})`, ephemeral: true });
        }
    }

    else if (interaction.isModalSubmit()) {
        const { customId, user, channel } = interaction;
        const userId = user.id;
        initializeUser(userId);

        if (customId === 'modal_unit') {
            const unitName = interaction.fields.getTextInputValue('unit_name');
            systemData.users[userId].unit = unitName;
            addExp(userId, 10);
            saveData();

            await interaction.reply({ content: `✅ اليونت: **${unitName}**`, ephemeral: true });
        }

        else if (customId === 'modal_identity') {
            const name = interaction.fields.getTextInputValue('identity_name');
            const age = interaction.fields.getTextInputValue('identity_age');
            const birthplace = interaction.fields.getTextInputValue('identity_birthplace');
            const job = interaction.fields.getTextInputValue('identity_job');

            systemData.identities[userId] = { name, age, birthplace, job };
            addExp(userId, 20);
            saveData();

            await interaction.reply({ content: '✅ تم إنشاء الهوية', ephemeral: true });
        }

        else if (customId === 'modal_bank_add') {
            const targetId = interaction.fields.getTextInputValue('user_id');
            const amount = parseInt(interaction.fields.getTextInputValue('amount'));

            if (isNaN(amount) || amount <= 0) {
                return await interaction.reply({ content: '❌ رقم غير صحيح', ephemeral: true });
            }

            initializeUser(targetId);
            systemData.users[targetId].money += amount;
            saveData();

            const embed = new EmbedBuilder()
                .setColor(Colors.Green)
                .setTitle('✅ تم إضافة المال')
                .addFields(
                    { name: '👤 المستخدم', value: `<@${targetId}>`, inline: true },
                    { name: '💵 المبلغ', value: `$${amount}`, inline: true },
                    { name: '💰 الرصيد الجديد', value: `$${systemData.users[targetId].money}`, inline: false }
                );

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        else if (customId === 'modal_bank_remove') {
            const targetId = interaction.fields.getTextInputValue('user_id');
            const amount = parseInt(interaction.fields.getTextInputValue('amount'));

            if (isNaN(amount) || amount <= 0) {
                return await interaction.reply({ content: '❌ رقم غير صحيح', ephemeral: true });
            }

            initializeUser(targetId);
            
            if (systemData.users[targetId].money < amount) {
                return await interaction.reply({ content: '❌ رصيد غير كافي', ephemeral: true });
            }

            systemData.users[targetId].money -= amount;
            saveData();

            const embed = new EmbedBuilder()
                .setColor(Colors.Orange)
                .setTitle('✅ تم سحب المال')
                .addFields(
                    { name: '👤 المستخدم', value: `<@${targetId}>`, inline: true },
                    { name: '💸 المبلغ', value: `$${amount}`, inline: true },
                    { name: '💰 الرصيد المتبقي', value: `$${systemData.users[targetId].money}`, inline: false }
                );

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        else if (customId === 'modal_bank_edit') {
            const targetId = interaction.fields.getTextInputValue('user_id');
            const newAmount = parseInt(interaction.fields.getTextInputValue('amount'));

            if (isNaN(newAmount) || newAmount < 0) {
                return await interaction.reply({ content: '❌ رقم غير صحيح', ephemeral: true });
            }

            initializeUser(targetId);
            const oldAmount = systemData.users[targetId].money;
            systemData.users[targetId].money = newAmount;
            saveData();

            const embed = new EmbedBuilder()
                .setColor(Colors.Blue)
                .setTitle('✅ تم تعديل الرصيد')
                .addFields(
                    { name: '👤 المستخدم', value: `<@${targetId}>`, inline: true },
                    { name: '💰 السابق', value: `$${oldAmount}`, inline: true },
                    { name: '💵 الجديد', value: `$${newAmount}`, inline: false }
                );

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        else if (customId === 'modal_admin_add_points') {
            const targetId = interaction.fields.getTextInputValue('user_id');
            const amount = parseInt(interaction.fields.getTextInputValue('amount'));

            if (isNaN(amount) || amount <= 0) {
                return await interaction.reply({ content: '❌ رقم غير صحيح', ephemeral: true });
            }

            initializeUser(targetId);
            systemData.users[targetId].points += amount;
            saveData();

            const embed = new EmbedBuilder()
                .setColor(Colors.Green)
                .setTitle('✅ تم إضافة النقاط')
                .addFields(
                    { name: '👤 المستخدم', value: `<@${targetId}>`, inline: true },
                    { name: '➕ النقاط المضافة', value: `${amount}`, inline: true },
                    { name: '💵 النقاط الجديدة', value: `${systemData.users[targetId].points}`, inline: false }
                );

            await interaction.reply({ embeds: [embed], ephemeral: true });

            try {
                const user = await client.users.fetch(targetId);
                const notif = new EmbedBuilder()
                    .setColor(Colors.Gold)
                    .setTitle('📧 تنبيه نقاط')
                    .setDescription(`تم إضافة **${amount}** نقاط لك\nإجمالي نقاطك الآن: **${systemData.users[targetId].points}**`)
                    .setTimestamp();
                await user.send({ embeds: [notif] });
            } catch (e) {}
        }

        else if (customId === 'modal_admin_remove_points') {
            const targetId = interaction.fields.getTextInputValue('user_id');
            const amount = parseInt(interaction.fields.getTextInputValue('amount'));

            if (isNaN(amount) || amount <= 0) {
                return await interaction.reply({ content: '❌ رقم غير صحيح', ephemeral: true });
            }

            initializeUser(targetId);
            
            if (systemData.users[targetId].points < amount) {
                return await interaction.reply({ content: '❌ نقاط غير كافية', ephemeral: true });
            }

            systemData.users[targetId].points -= amount;
            saveData();

            const embed = new EmbedBuilder()
                .setColor(Colors.Orange)
                .setTitle('✅ تم إزالة النقاط')
                .addFields(
                    { name: '👤 المستخدم', value: `<@${targetId}>`, inline: true },
                    { name: '➖ النقاط المزالة', value: `${amount}`, inline: true },
                    { name: '💵 النقاط المتبقية', value: `${systemData.users[targetId].points}`, inline: false }
                );

            await interaction.reply({ embeds: [embed], ephemeral: true });

            try {
                const user = await client.users.fetch(targetId);
                const notif = new EmbedBuilder()
                    .setColor(Colors.Red)
                    .setTitle('📧 تنبيه نقاط')
                    .setDescription(`تم إزالة **${amount}** نقاط منك\nإجمالي نقاطك الآن: **${systemData.users[targetId].points}**`)
                    .setTimestamp();
                await user.send({ embeds: [notif] });
            } catch (e) {}
        }

        else if (customId === 'modal_admin_login_count') {
            const targetId = interaction.fields.getTextInputValue('user_id');
            initializeUser(targetId);

            const user = systemData.users[targetId];

            const embed = new EmbedBuilder()
                .setColor(Colors.Blue)
                .setTitle('📊 إحصائيات الدخول')
                .addFields(
                    { name: '👤 الشخص', value: `<@${targetId}>`, inline: true },
                    { name: '📊 الاسم', value: user.name, inline: true },
                    { name: '⏰ آخر دخول', value: user.loginTime || 'لم يسجل دخول', inline: false },
                    { name: '🔄 الحالة الحالية', value: user.status === 'online' ? '✅ متصل' : '❌ غير متصل', inline: true }
                );

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        else if (customId === 'modal_admin_get_points') {
            const targetId = interaction.fields.getTextInputValue('user_id');
            initializeUser(targetId);

            const user = systemData.users[targetId];
            const rank = getRank(user.points);

            const embed = new EmbedBuilder()
                .setColor(Colors.Gold)
                .setTitle('💵 معلومات النقاط')
                .addFields(
                    { name: '👤 الشخص', value: `<@${targetId}>`, inline: true },
                    { name: '📊 الاسم', value: user.name, inline: true },
                    { name: '💵 النقاط', value: `${user.points}`, inline: true },
                    { name: '⚔️ الرتبة', value: `${rank.emoji} ${rank.name}`, inline: false }
                );

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        else if (customId === 'modal_suggestion') {
            const suggestion = interaction.fields.getTextInputValue('suggestion_text');

            const suggestionId = `sug_${Date.now()}`;
            systemData.suggestions[suggestionId] = {
                author: user.username,
                authorId: userId,
                text: suggestion,
                createdAt: new Date().toLocaleString('ar-SA'),
                upvotes: 0,
                downvotes: 0
            };
            addExp(userId, 15);
            saveData();

            const embed = new EmbedBuilder()
                .setColor(Colors.Green)
                .setTitle('💡 اقتراح جديد')
                .setDescription(suggestion)
                .setFooter({ text: `من: ${user.username}` });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`suggest_upvote_${suggestionId}`)
                        .setLabel('👍 0')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`suggest_downvote_${suggestionId}`)
                        .setLabel('👎 0')
                        .setStyle(ButtonStyle.Secondary)
                );

            try {
                const sugChannel = await client.channels.fetch(CONFIG.channels.suggestions);
                await sugChannel.send({ embeds: [embed], components: [row] });
            } catch (e) {}

            await interaction.reply({ content: '✅ تم الإرسال', ephemeral: true });
        }
    }
});

client.on('interactionCreate', async interaction => {
    const userId = interaction.user.id;
    
    if (systemData.users[userId] && systemData.users[userId].name === 'غير محدد') {
        systemData.users[userId].name = interaction.user.username;
        saveData();
    }
});

client.on('voiceStateUpdate', (oldState, newState) => {
    const userId = newState.id;
    
    if (newState.channel && !oldState.channel) {
        systemData.voiceTimers[userId] = Date.now();
        saveData();
    } else if (!newState.channel && oldState.channel) {
        if (systemData.voiceTimers[userId]) {
            const timeSpent = (Date.now() - systemData.voiceTimers[userId]) / 1000 / 60;
            if (timeSpent >= 30) {
                initializeUser(userId);
                systemData.users[userId].money += 2000;
                systemData.users[userId].totalVoiceTime += timeSpent;
                addExp(userId, Math.floor(timeSpent / 5));
                checkAchievement(userId);
                saveData();
            }
            delete systemData.voiceTimers[userId];
            saveData();
        }
    }
});

client.login(TOKEN);
