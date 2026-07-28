import{aX as n,ay as R}from"./iframe-Dr_VwFta.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-DlRbtcY9.js";import{P as H}from"./project-modal-DIi1iccF.js";import"./preload-helper-Dp1pzeXC.js";import"./index-DbknnWkK.js";import"./Select-ef7c0426.esm-DAVOj5bJ.js";import"./chevron-down-DQvzNExA.js";import"./check-DY-hLZWr.js";import"./index-CPeuVqq3.js";import"./triangle-alert-DAvh6LaN.js";import"./export-menu-BnZ4XTYk.js";import"./client-CfyM-BlH.js";import"./markdown-preview-BFOF95CL.js";import"./index.dom-D_wTd2ti.js";import"./file-text-BQ0MBE-U.js";import"./copy-B9ltfRSS.js";import"./file-code-corner-D0QfsMAt.js";import"./loader-circle-DTEd4G6m.js";import"./api-CleKQgFz.js";import"./folder-open-DMLYP9p9.js";import"./folder-DKkOlzov.js";import"./tag-color-picker-DG1gy-SP.js";import"./project-tag-Bs2GOdeZ.js";import"./sparkles-Cs_jyHTG.js";import"./brain-CFKGUKH1.js";import"./chevron-right-DCYLM4Ch.js";import"./markdown-editor-Cq2IrOwF.js";import"./pencil-DeR-l2dr.js";import"./trash-2-059ARBlU.js";import"./templates-BIfTjvPG.js";import"./plus-BibRmqiN.js";import"./task-row-B6Z_uvOY.js";import"./i18n-labels-Cjc-x4Lr.js";import"./selectable-icon-D5_o9uRB.js";import"./hover-expand-button-BHrZL0vf.js";import"./index-DubJRMxG.js";import"./data-refresh-DwVx7zZg.js";import"./rotate-ccw-BvjUw83q.js";import"./play-CPsT9xAk.js";import"./square-terminal-Dn8T12bp.js";import"./task-columns-BUR8DOSo.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ja={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
