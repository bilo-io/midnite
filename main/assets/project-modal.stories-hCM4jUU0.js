import{a_ as n,ax as R}from"./iframe-DGTzC655.js";import{c as N,q as x,k as B,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-FnNQBX7T.js";import{P as H}from"./project-modal-rJvVGT4M.js";import"./preload-helper-Dp1pzeXC.js";import"./index-DtSqUx_P.js";import"./Select-ef7c0426.esm-B91OB_Ca.js";import"./chevron-down-Dzfo0S2z.js";import"./check-1Qsczorf.js";import"./index-DkH9PpOg.js";import"./export-menu-Du2R4M2o.js";import"./client-DVM2bddV.js";import"./markdown-preview-LiVLujgH.js";import"./index.dom-D_wTd2ti.js";import"./file-text-CgI4iZGn.js";import"./copy-DwMWbPGY.js";import"./file-code-corner-CnJlniry.js";import"./loader-circle-CEgbo75J.js";import"./api-C-ORmROe.js";import"./folder-open-DvrJTfEc.js";import"./folder-5z9QcxzC.js";import"./tag-color-picker-8uBr7lmB.js";import"./project-tag-Hqv6WuUW.js";import"./sparkles-CFUMhXIV.js";import"./brain-BBigkZ5w.js";import"./chevron-right-DP3dKKLL.js";import"./markdown-editor-BPdc5U3D.js";import"./pencil-C33RNF2s.js";import"./trash-2-DYjGCppr.js";import"./templates-CvusFARI.js";import"./plus-CVJEZdtw.js";import"./task-row-CmM4XkN9.js";import"./blocked-badge-D5UDJxdt.js";import"./selectable-icon-DQHJaOvb.js";import"./hover-expand-button-DNQS8v0p.js";import"./index-CiF2WvTa.js";import"./data-refresh-Bo76m2Fd.js";import"./rotate-ccw-IdHjHSsf.js";import"./play-DIiPk1IC.js";import"./square-terminal-Da8kjznX.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-B49Up_QR.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ja={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[x,B],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[x,B]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
