import{aX as n,ax as R}from"./iframe-zwt-8yYf.js";import{c as N,q as x,k as B,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-BkEOzlnU.js";import{P as H}from"./project-modal-MOaVrubL.js";import"./preload-helper-Dp1pzeXC.js";import"./index-PYbvJYhy.js";import"./Select-ef7c0426.esm-ATTBtIHg.js";import"./chevron-down-o9u8cArH.js";import"./check-Ck2R87jE.js";import"./index-B0MyLQ8X.js";import"./triangle-alert-DmFXG_Eh.js";import"./export-menu-v8ik6cbu.js";import"./client-BYqPhUF1.js";import"./markdown-preview-PWYUObnY.js";import"./index.dom-D_wTd2ti.js";import"./file-text-zdxrUGbD.js";import"./copy-D9UbkFqM.js";import"./file-code-corner-Dds5ySC7.js";import"./loader-circle-BSO_r_km.js";import"./api-Cj0Uu1Vy.js";import"./folder-open-BtAkciwW.js";import"./folder-DHfMV0pj.js";import"./tag-color-picker-CkQUjnWE.js";import"./project-tag-BqvUoxpe.js";import"./sparkles-CqZnrBKT.js";import"./brain-Bob5H6d4.js";import"./chevron-right-CcwOadAE.js";import"./markdown-editor-eNYm9Bam.js";import"./pencil-DM6F6sIl.js";import"./trash-2-BFuKNlz9.js";import"./templates-B6M1OYb3.js";import"./plus-By5OTE90.js";import"./task-row-CcQKQdT_.js";import"./blocked-badge-CJbu1xJ5.js";import"./selectable-icon-BTPnMily.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-DQnTufvB.js";import"./arrow-left-C5ZINheA.js";var s,c,p,l,d,m,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ya={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[x,B],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[x,B]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.source},description:{story:"Creating a project — empty form under the Details tab.",...(d=o.parameters)===null||d===void 0||(l=d.docs)===null||l===void 0?void 0:l.description}}};i.parameters={...i.parameters,docs:{...(m=i.parameters)===null||m===void 0?void 0:m.docs,source:{originalSource:`{
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
}`,...(T=r.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Plan marks that tab selected.",...(b=r.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const Ta=["New","Edit","SwitchTab"];export{i as Edit,o as New,r as SwitchTab,Ta as __namedExportsOrder,ya as default};
