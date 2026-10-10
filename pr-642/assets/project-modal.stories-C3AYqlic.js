import{b4 as n,aB as R}from"./iframe-BgzrFP2X.js";import{c as N,q as S,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-1awDMq47.js";import{P as H}from"./project-modal-CVai9gz0.js";import"./preload-helper-Dp1pzeXC.js";import"./index-CmaeQuNi.js";import"./Select-ef7c0426.esm-D3c2qTfS.js";import"./chevron-down-qaYDqezv.js";import"./check-zxS8ESfU.js";import"./export-menu-BTSWxFgp.js";import"./client-DyTwMlkC.js";import"./markdown-preview-9ZD8t41B.js";import"./index.dom-D_wTd2ti.js";import"./copy-uE1AimxC.js";import"./file-code-corner-DuCaLg26.js";import"./file-text-C5wPkGbH.js";import"./loader-circle-BUqZTeIh.js";import"./api-DB4WVoNn.js";import"./folder-open-uh_nuEFc.js";import"./folder-C0AOHxg9.js";import"./tag-color-picker-BNcGJobw.js";import"./project-tag-B3X6SDpc.js";import"./sparkles-C5wXT7-C.js";import"./brain-1L8t2Clf.js";import"./chevron-right-DjSnxvGh.js";import"./markdown-editor-DoXduQfx.js";import"./pencil-_dd3EkNO.js";import"./trash-2-BpJgJ_j1.js";import"./templates-BdtUVBxQ.js";import"./project-template-labels-CDTXxKfL.js";import"./plus-CJfMPALt.js";import"./task-row-Cw4ZpoBX.js";import"./blocked-badge-BqKlHFq9.js";import"./selectable-icon-DYSWgCu0.js";import"./hover-expand-button-DbvxCjLG.js";import"./index-F59Mpwz2.js";import"./data-refresh-CJJHMSUQ.js";import"./rotate-ccw-PJtC-_N1.js";import"./play-DYOBjo5S.js";import"./square-terminal-CwoQA1lS.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-Bt0XlFRc.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ja={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[S,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[S,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),B=t(e).getByRole("tab",{name:/plan/i});await C.click(B),await f(B).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
