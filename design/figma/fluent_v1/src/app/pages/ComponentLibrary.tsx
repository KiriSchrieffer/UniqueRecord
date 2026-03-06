import React, { useMemo, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader, CardSection } from '../components/fluent/Card';
import { Button } from '../components/fluent/Button';
import { TextField } from '../components/fluent/TextField';
import { Dropdown } from '../components/fluent/Dropdown';
import { Switch } from '../components/fluent/Switch';
import { StatusBadge } from '../components/fluent/StatusBadge';
import { Tabs } from '../components/fluent/Tabs';
import { Table } from '../components/fluent/Table';
import { Modal } from '../components/fluent/Modal';
import { Save, Trash2, Settings, Search, PlayCircle } from 'lucide-react';
import { useI18n } from '../i18n';

export default function ComponentLibrary() {
  const { tr } = useI18n();
  const [inputValue, setInputValue] = useState('');
  const [dropdownValue, setDropdownValue] = useState('option1');
  const [switchValue, setSwitchValue] = useState(true);
  const [activeTab, setActiveTab] = useState('buttons');
  const [isModalOpen, setIsModalOpen] = useState(false);
  type DemoStatus = 'idle' | 'detecting' | 'recording' | 'error' | 'success';
  type TableRow = { name: string; value: string; status: DemoStatus; statusText: string };

  const dropdownOptions = useMemo(
    () => [
      { value: 'option1', label: tr('选项 1', 'Option 1'), recommended: true },
      { value: 'option2', label: tr('选项 2', 'Option 2') },
      { value: 'option3', label: tr('选项 3', 'Option 3') },
    ],
    [tr]
  );

  const tableColumns = useMemo(
    () => [
      { key: 'name', header: tr('名称', 'Name') },
      { key: 'value', header: tr('值', 'Value') },
      {
        key: 'status',
        header: tr('状态', 'Status'),
        render: (_value: string, row: TableRow) => <StatusBadge status={row.status} text={row.statusText} size="sm" />,
      },
    ],
    [tr]
  );

  const tableData = useMemo(
    () => [
      { name: tr('项目 1', 'Item 1'), value: tr('数据 1', 'Data 1'), status: 'success', statusText: tr('成功', 'Success') },
      {
        name: tr('项目 2', 'Item 2'),
        value: tr('数据 2', 'Data 2'),
        status: 'recording',
        statusText: tr('录制中', 'Recording'),
      },
      { name: tr('项目 3', 'Item 3'), value: tr('数据 3', 'Data 3'), status: 'idle', statusText: tr('待机', 'Idle') },
    ],
    [tr]
  );

  const componentTabs = useMemo(
    () => [
      { id: 'buttons', label: 'Buttons', icon: <Settings size={16} /> },
      { id: 'inputs', label: 'Inputs', icon: <Search size={16} /> },
      { id: 'status', label: 'Status', icon: <PlayCircle size={16} /> },
    ],
    []
  );

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-[var(--text-3xl)] font-semibold mb-2">{tr('组件库', 'Component Library')}</h1>
          <p className="text-[14px] text-[var(--muted-foreground)]">{tr('UniqueRecord Fluent 组件库展示页', 'UniqueRecord Fluent component showcase')}</p>
        </div>

        <Card padding="lg" className="mb-6">
          <CardHeader title={tr('按钮', 'Buttons')} subtitle={tr('按钮变体与尺寸', 'Button variants and sizes')} />

          <div className="space-y-4">
            <div>
              <p className="text-[12px] font-medium mb-2 text-[var(--muted-foreground)]">{tr('主按钮样式', 'Primary Variant')}</p>
              <div className="flex items-center gap-2">
                <Button variant="primary" size="sm">{tr('小', 'Small')}</Button>
                <Button variant="primary" size="md">{tr('中', 'Medium')}</Button>
                <Button variant="primary" size="lg">{tr('大', 'Large')}</Button>
                <Button variant="primary" disabled>{tr('禁用', 'Disabled')}</Button>
              </div>
            </div>

            <div>
              <p className="text-[12px] font-medium mb-2 text-[var(--muted-foreground)]">{tr('次按钮样式', 'Secondary Variant')}</p>
              <div className="flex items-center gap-2">
                <Button variant="secondary">
                  <Save size={18} />
                  {tr('带图标', 'With icon')}
                </Button>
                <Button variant="secondary">{tr('取消', 'Cancel')}</Button>
                <Button variant="secondary" disabled>{tr('禁用', 'Disabled')}</Button>
              </div>
            </div>

            <div>
              <p className="text-[12px] font-medium mb-2 text-[var(--muted-foreground)]">{tr('其他样式', 'Other Variants')}</p>
              <div className="flex items-center gap-2">
                <Button variant="subtle">{tr('低强调', 'Subtle')}</Button>
                <Button variant="accent">{tr('强调', 'Accent')}</Button>
                <Button variant="destructive">
                  <Trash2 size={18} />
                  {tr('删除', 'Delete')}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card padding="lg" className="mb-6">
          <CardHeader
            title={tr('卡片', 'Cards')}
            subtitle={tr('不同配置的卡片组件', 'Card variants and styles')}
            action={<Button variant="subtle" size="sm">{tr('操作', 'Action')}</Button>}
          />

          <div className="grid grid-cols-3 gap-4">
            <Card padding="md" shadow>
              <h4 className="font-semibold mb-2">{tr('默认卡片', 'Default card')}</h4>
              <p className="text-[13px] text-[var(--muted-foreground)]">{tr('带阴影的标准卡片', 'Standard card with shadow')}</p>
            </Card>

            <Card padding="md" hover>
              <h4 className="font-semibold mb-2">{tr('悬浮卡片', 'Hover card')}</h4>
              <p className="text-[13px] text-[var(--muted-foreground)]">{tr('鼠标悬停有视觉反馈', 'Hover interaction feedback')}</p>
            </Card>

            <Card padding="md" shadow={false}>
              <h4 className="font-semibold mb-2">{tr('无阴影卡片', 'Flat card')}</h4>
              <p className="text-[13px] text-[var(--muted-foreground)]">{tr('扁平化风格', 'Flat visual style')}</p>
            </Card>
          </div>

          <CardSection>
            <p className="text-[13px] text-[var(--muted-foreground)]">{tr('CardSection 用于分隔卡片内部不同内容区域。', 'CardSection separates content areas inside a card.')}</p>
          </CardSection>
        </Card>

        <Card padding="lg" className="mb-6">
          <CardHeader title={tr('文本输入', 'Text Fields')} subtitle={tr('输入框状态示例', 'Input field states')} />

          <div className="grid grid-cols-2 gap-4">
            <TextField
              label={tr('标准输入框', 'Standard input')}
              placeholder={tr('请输入内容...', 'Enter text...')}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              helperText={tr('这是帮助文本', 'Helper text example')}
            />

            <TextField label={tr('带图标输入框', 'Input with icon')} placeholder={tr('搜索...', 'Search...')} icon={<Search size={16} />} />

            <TextField label={tr('禁用状态', 'Disabled state')} value={tr('禁用输入', 'Disabled input')} disabled />

            <TextField label={tr('错误状态', 'Error state')} value={tr('错误输入', 'Invalid input')} error={tr('这是错误信息', 'Error message')} />
          </div>
        </Card>

        <Card padding="lg" className="mb-6">
          <CardHeader title={tr('下拉与开关', 'Dropdowns & Switches')} subtitle={tr('下拉选择与开关组件', 'Dropdown and switch components')} />

          <div className="grid grid-cols-2 gap-6">
            <div>
              <Dropdown label={tr('下拉选择框', 'Dropdown')} options={dropdownOptions} value={dropdownValue} onChange={setDropdownValue} />
            </div>

            <div className="space-y-3">
              <Switch label={tr('开关（已启用）', 'Switch (enabled)')} checked={switchValue} onChange={setSwitchValue} />
              <Switch label={tr('开关（已禁用）', 'Switch (off)')} checked={false} onChange={() => {}} />
              <Switch label={tr('禁用开关', 'Disabled switch')} checked={false} onChange={() => {}} disabled />
            </div>
          </div>
        </Card>

        <Card padding="lg" className="mb-6">
          <CardHeader title={tr('状态徽章', 'Status Badges')} subtitle={tr('应用状态视觉编码', 'Visual coding for app states')} />

          <div className="space-y-4">
            <div>
              <p className="text-[12px] font-medium mb-2 text-[var(--muted-foreground)]">{tr('默认尺寸（带圆点）', 'Default size (with dot)')}</p>
              <div className="flex items-center gap-2">
                <StatusBadge status="idle" text={tr('待机中', 'Idle')} />
                <StatusBadge status="detecting" text={tr('检测中', 'Detecting')} />
                <StatusBadge status="recording" text={tr('录制中', 'Recording')} />
                <StatusBadge status="error" text={tr('错误', 'Error')} />
                <StatusBadge status="success" text={tr('成功', 'Success')} />
              </div>
            </div>

            <div>
              <p className="text-[12px] font-medium mb-2 text-[var(--muted-foreground)]">{tr('小尺寸（无圆点）', 'Small size (without dot)')}</p>
              <div className="flex items-center gap-2">
                <StatusBadge status="idle" text={tr('待机', 'Idle')} size="sm" showDot={false} />
                <StatusBadge status="detecting" text={tr('检测', 'Detecting')} size="sm" showDot={false} />
                <StatusBadge status="recording" text={tr('录制', 'Recording')} size="sm" showDot={false} />
                <StatusBadge status="error" text={tr('错误', 'Error')} size="sm" showDot={false} />
                <StatusBadge status="success" text={tr('成功', 'Success')} size="sm" showDot={false} />
              </div>
            </div>
          </div>
        </Card>

        <Card padding="lg" className="mb-6">
          <CardHeader title={tr('标签页', 'Tabs')} subtitle={tr('标签页导航组件', 'Tab navigation component')} />

          <Tabs tabs={componentTabs} activeTab={activeTab} onChange={setActiveTab} />

          <div className="mt-4 p-4 bg-[var(--neutral-10)] rounded-[var(--radius-lg)]">
            <p className="text-[14px]">
              {tr('当前激活标签', 'Active tab')}: <strong>{activeTab}</strong>
            </p>
          </div>
        </Card>

        <Card padding="lg" className="mb-6">
          <CardHeader title={tr('表格', 'Table')} subtitle={tr('数据表格组件', 'Data table component')} />

          <Table columns={tableColumns} data={tableData} />
        </Card>

        <Card padding="lg">
          <CardHeader title={tr('对话框', 'Modal')} subtitle={tr('模态对话框组件', 'Modal dialog component')} />

          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            {tr('打开对话框', 'Open modal')}
          </Button>

          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title={tr('示例对话框', 'Sample modal')}
            size="md"
            footer={
              <>
                <Button variant="subtle" onClick={() => setIsModalOpen(false)}>
                  {tr('取消', 'Cancel')}
                </Button>
                <Button variant="primary" onClick={() => setIsModalOpen(false)}>
                  {tr('确认', 'Confirm')}
                </Button>
              </>
            }
          >
            <div className="space-y-3">
              <p className="text-[14px]">{tr('这是一个示例对话框，展示 Modal 组件的基础用法。', 'This sample dialog demonstrates basic Modal usage.')}</p>
              <p className="text-[14px] text-[var(--muted-foreground)]">{tr('支持不同尺寸（sm / md / lg）以及自定义标题和底部操作。', 'Supports multiple sizes (sm / md / lg) and customizable header/footer actions.')}</p>
            </div>
          </Modal>
        </Card>

        <Card padding="lg" className="mt-6 bg-[var(--neutral-10)]">
          <CardHeader title={tr('使用示例', 'Usage samples')} />

          <div className="space-y-3 text-[13px]">
            <div>
              <p className="font-medium mb-1">{tr('Button 示例', 'Button example')}:</p>
              <code className="block bg-[var(--neutral-100)] text-[#a0a0a0] p-2 rounded-[var(--radius-sm)] font-mono text-[11px]">
                {'<Button variant="primary" size="md">Save</Button>'}
              </code>
            </div>

            <div>
              <p className="font-medium mb-1">{tr('TextField 示例', 'TextField example')}:</p>
              <code className="block bg-[var(--neutral-100)] text-[#a0a0a0] p-2 rounded-[var(--radius-sm)] font-mono text-[11px]">
                {'<TextField label="Label" value={value} onChange={handleChange} />'}
              </code>
            </div>

            <div>
              <p className="font-medium mb-1">{tr('StatusBadge 示例', 'StatusBadge example')}:</p>
              <code className="block bg-[var(--neutral-100)] text-[#a0a0a0] p-2 rounded-[var(--radius-sm)] font-mono text-[11px]">
                {'<StatusBadge status="recording" text="Recording" />'}
              </code>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
