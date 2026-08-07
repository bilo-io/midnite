import{b1 as n,ax as R}from"./iframe-Ca-MuGJ4.js";import{c as N,q as x,k as B,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-BqQjVRLe.js";import{P as H}from"./project-modal-Di7Vi8_u.js";import"./preload-helper-Dp1pzeXC.js";import"./index-Bq3Jsyqv.js";import"./Select-ef7c0426.esm-Dtv-oxYH.js";import"./chevron-down-CM1iNlGz.js";import"./check-BUfFT45s.js";import"./export-menu-DHy-2oXZ.js";import"./client-L6DJgq5K.js";import"./markdown-preview-C8tDxoCA.js";import"./index.dom-D_wTd2ti.js";import"./copy-DEfUb2Z9.js";import"./file-code-corner-B7RoV5Ro.js";import"./file-text-C1U_CEmA.js";import"./loader-circle-ME4BhDfy.js";import"./api-Bo8fV7ym.js";import"./folder-open-BzvSW_ax.js";import"./folder-CANMY8jb.js";import"./tag-color-picker-Cm7SIljj.js";import"./project-tag-BBc1-82N.js";import"./sparkles-DLHgAdcl.js";import"./brain-DYUOXJ1t.js";import"./chevron-right-BHdIciB0.js";import"./markdown-editor-B43v-Vgd.js";import"./pencil-BD_hbqXB.js";import"./trash-2-BXyaZLMd.js";import"./templates-C-htojI0.js";import"./project-template-labels-BpchYLNr.js";import"./plus-CMMinTB0.js";import"./task-row-UeOezo9D.js";import"./blocked-badge-CXOLklSb.js";import"./selectable-icon-BF7Z7uEX.js";import"./hover-expand-button-bbk_rJ-E.js";import"./index-BEGMl3cf.js";import"./data-refresh-DUbV4gAk.js";import"./rotate-ccw-B-YeUdfG.js";import"./play-DYTMguRo.js";import"./square-terminal-Ci77KHGY.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-DbUP1WcY.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ja={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[x,B],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[x,B]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
