import{n as s,T as R}from"./iframe-CJ1m4Ybm.js";import{c as N,q as B,k as x,p as j}from"./fixtures-CckvYj1j.js";import{a as P}from"./confirm-dialog-CrGE-Z21.js";import{P as H}from"./project-modal-Dhm1fB2X.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-Dn-VHSaA.js";import"./index-CliU6RMt.js";import"./check-Dp1RnyS0.js";import"./triangle-alert-BH4QQAoL.js";import"./export-menu-CYct_o78.js";import"./client-GW6pKhkC.js";import"./markdown-preview-ZX7bDfEA.js";import"./file-text-BwNRTmya.js";import"./copy-CQZ0k87Q.js";import"./loader-circle-DbEkz5fD.js";import"./api-A95bhGP6.js";import"./inbound-CbJZzwyX.js";import"./folder-open-DcrFiXNv.js";import"./folder-GZ_iMT7X.js";import"./project-tag-DoLGdFsr.js";import"./tag-color-picker-B__PtJq_.js";import"./source-list-editor-nlSISOTv.js";import"./source-icon-DmTyxwIs.js";import"./globe-Cx59IRyh.js";import"./sticky-note-ninkO3Rl.js";import"./plus-CWeJpqka.js";import"./external-link-xv-quatx.js";import"./task-row-C4dJyzdP.js";import"./blocked-badge-9ajtvp7l.js";import"./selectable-icon-C9hctgF5.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-wzzB0Kk4.js";import"./pencil-DV-O3SdQ.js";import"./trash-2-DowimOPd.js";import"./refresh-cw-CBvsisjG.js";import"./index-DgnFcoj8.js";import"./lightbulb-DNVDBmLf.js";import"./templates-B6M1OYb3.js";import"./sparkles-Bw7gUbe-.js";import"./brain-n0eLqmDm.js";import"./chevron-right-5pPo8C5n.js";var n,c,p,m,d,l,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:L,within:t}=__STORYBOOK_MODULE_TEST__,ba={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>s.jsx(R,{children:s.jsx(P,{children:s.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},r={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},i={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),k=t(e).getByRole("tab",{name:/sources/i});await L.click(k),await f(k).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(n=o.parameters)===null||n===void 0?void 0:n.docs,source:{originalSource:`{
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
