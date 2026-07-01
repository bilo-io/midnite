import{n as s,T as R}from"./iframe-pMjuI2BH.js";import{c as N,q as B,k as x,p as j}from"./fixtures-CckvYj1j.js";import{a as P}from"./confirm-dialog-CYzyadN2.js";import{P as H}from"./project-modal-xCCI7-WS.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-6fvQ0VF1.js";import"./index-DJOaXCN-.js";import"./check-BPiI6dyj.js";import"./triangle-alert-CgKuL9WG.js";import"./export-menu-DSolrcuZ.js";import"./client-wRQ-ccKO.js";import"./markdown-preview-DL_gszda.js";import"./file-text-Ci3FzmdY.js";import"./copy-C_Zj3vvM.js";import"./loader-circle-C72xWuVu.js";import"./api-4WxRUCnO.js";import"./inbound-B8us280C.js";import"./folder-open-C2rn_Ha9.js";import"./folder-iLCZzGH3.js";import"./project-tag-CzBD8z48.js";import"./tag-color-picker-wdEOx87a.js";import"./source-list-editor-CsKnJhKQ.js";import"./source-icon-B_8Kgrbm.js";import"./globe-BbSVfIua.js";import"./sticky-note-D3XcxY0l.js";import"./plus-CnFhhYut.js";import"./external-link-ZMHYr9th.js";import"./task-row-DBrk8Sa2.js";import"./blocked-badge-B2VW4KKP.js";import"./selectable-icon-DUGoSuBs.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-DJOYEhpc.js";import"./pencil-mUQb8oDV.js";import"./trash-2-BvqzFsTx.js";import"./refresh-cw-CGiO1II2.js";import"./index-DvrzW8_s.js";import"./lightbulb-C3gilxTU.js";import"./templates-B6M1OYb3.js";import"./sparkles-CZ_wY-Hr.js";import"./brain-1xAX9awS.js";import"./chevron-right-BWbCgxn3.js";var n,c,p,m,d,l,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:L,within:t}=__STORYBOOK_MODULE_TEST__,ba={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>s.jsx(R,{children:s.jsx(P,{children:s.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},r={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},i={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),k=t(e).getByRole("tab",{name:/sources/i});await L.click(k),await f(k).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(n=o.parameters)===null||n===void 0?void 0:n.docs,source:{originalSource:`{
  args: {
    project: null
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'New project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue('');
  }
}`,...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.source},description:{story:"Creating a project — empty form under the Details tab.",...(d=o.parameters)===null||d===void 0||(m=d.docs)===null||m===void 0?void 0:m.description}}};r.parameters={...r.parameters,docs:{...(l=r.parameters)===null||l===void 0?void 0:l.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug],
    memories: [memoryProjectScoped],
    onSelectTask: fn()
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue(project.name);
  }
}`,...(u=r.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.source},description:{story:"Editing a project — fields pre-filled, with tasks + a scoped memory surfaced.",...(w=r.parameters)===null||w===void 0||(_=w.docs)===null||_===void 0?void 0:_.description}}};i.parameters={...i.parameters,docs:{...(g=i.parameters)===null||g===void 0?void 0:g.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug]
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    const sourcesTab = within(dialog).getByRole('tab', {
      name: /sources/i
    });
    await userEvent.click(sourcesTab);
    await expect(sourcesTab).toHaveAttribute('aria-selected', 'true');
  }
}`,...(T=i.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Sources marks that tab selected.",...(b=i.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const ja=["New","Edit","SwitchTab"];export{r as Edit,o as New,i as SwitchTab,ja as __namedExportsOrder,ba as default};
