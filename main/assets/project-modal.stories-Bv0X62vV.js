import{a_ as n,ax as R}from"./iframe-2w8WUB7i.js";import{c as N,q as x,k as B,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-DrxxWzsz.js";import{P as H}from"./project-modal-BUZs2dnt.js";import"./preload-helper-Dp1pzeXC.js";import"./index-g8mfm3rF.js";import"./Select-ef7c0426.esm-31hPiniX.js";import"./chevron-down-CMciDkeD.js";import"./check-DphwQmXI.js";import"./index-Duqm8mUL.js";import"./export-menu-UcxcXz5w.js";import"./client-CIgzJ8Lj.js";import"./markdown-preview-Uy3HQOb-.js";import"./index.dom-D_wTd2ti.js";import"./file-text-C4T0dhAd.js";import"./copy-BpkMMccI.js";import"./file-code-corner-DhTSFV62.js";import"./loader-circle-CWmU52n4.js";import"./api-DEhZjO2T.js";import"./folder-open-DyT--brf.js";import"./folder-BXS0NgVe.js";import"./tag-color-picker-BPjNcq2q.js";import"./project-tag-1vPeUe76.js";import"./sparkles-DfwE8PX0.js";import"./brain-BwQZPT0d.js";import"./chevron-right-BIILyTFj.js";import"./markdown-editor-CvX72EXK.js";import"./pencil-DuBhdr7n.js";import"./trash-2-BjFm56Zf.js";import"./templates-BVPqduWD.js";import"./plus-ByxAXtii.js";import"./task-row-v1ALEKN7.js";import"./blocked-badge-Dp9ic8Xi.js";import"./selectable-icon-BqIFI_mS.js";import"./hover-expand-button-DCxnBoZY.js";import"./index-B0brNB0j.js";import"./data-refresh-C710zyF5.js";import"./rotate-ccw-DNFqCMC8.js";import"./play-Dgy13qIe.js";import"./square-terminal-Bm8SZSB7.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-D1WKTH9x.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ja={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[x,B],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[x,B]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.source},description:{story:"Creating a project — empty form under the Details tab.",...(m=o.parameters)===null||m===void 0||(l=m.docs)===null||l===void 0?void 0:l.description}}};i.parameters={...i.parameters,docs:{...(d=i.parameters)===null||d===void 0?void 0:d.docs,source:{originalSource:`{
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
}`,...(u=i.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.source},description:{story:"Editing a project — fields pre-filled, with tasks + a scoped memory surfaced.",...(w=i.parameters)===null||w===void 0||(_=w.docs)===null||_===void 0?void 0:_.description}}};r.parameters={...r.parameters,docs:{...(g=r.parameters)===null||g===void 0?void 0:g.docs,source:{originalSource:`{
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
    const planTab = within(dialog).getByRole('tab', {
      name: /plan/i
    });
    await userEvent.click(planTab);
    await expect(planTab).toHaveAttribute('aria-selected', 'true');
  }
}`,...(T=r.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Plan marks that tab selected.",...(b=r.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const ha=["New","Edit","SwitchTab"];export{i as Edit,o as New,r as SwitchTab,ha as __namedExportsOrder,ja as default};
