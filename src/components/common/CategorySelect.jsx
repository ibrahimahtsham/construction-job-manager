import React, { useRef, useState } from 'react';
import { Select, Button, Divider } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client.js';

function CategorySelect({ category, onChange, ...selectProps }) {
  const queryClient = useQueryClient();
  const [newValue, setNewValue] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef(null);

  const { data: options = [] } = useQuery({
    queryKey: ['category-options', category],
    queryFn: async () => {
      const { data } = await client.get(`/category-options?category=${category}`);
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async (value) => {
      const { data } = await client.post('/category-options', { category, value });
      return data;
    },
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ['category-options', category] });
      if (onChange) onChange(item.value);
      setNewValue('');
      setDropdownOpen(false);
    },
  });

  const handleAdd = () => {
    if (newValue.trim()) addMutation.mutate(newValue.trim());
  };

  return (
    <Select
      {...selectProps}
      onChange={onChange}
      open={dropdownOpen}
      onDropdownVisibleChange={setDropdownOpen}
      dropdownRender={(menu) => (
        <>
          {menu}
          <Divider style={{ margin: '4px 0', borderColor: '#2e3550' }} />
          <div style={{ padding: '8px 8px 4px', display: 'flex', gap: 8 }}>
            <input
              ref={inputRef}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Add new..."
              style={{
                flex: 1,
                background: '#141826',
                border: '1px solid #2e3550',
                borderRadius: 4,
                color: '#f0ede8',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 13,
                padding: '4px 8px',
                outline: 'none',
              }}
            />
            <Button
              type="text"
              icon={<PlusOutlined />}
              onClick={handleAdd}
              loading={addMutation.isPending}
              style={{ color: '#d4870a', padding: '0 8px' }}
            >
              Add
            </Button>
          </div>
        </>
      )}
    >
      {options.map((opt) => (
        <Select.Option key={opt.id} value={opt.value}>
          {opt.value}
        </Select.Option>
      ))}
    </Select>
  );
}

export default CategorySelect;
